/**
 * Curate Engine — Dedicated Image Processing Web Worker
 * Offloads Lanczos-3 convolution, color harmonization and preset filters
 * from the UI thread to maintain 60 FPS responsiveness.
 */

import { upscaleLanczos3 } from '../engine/upscale-lanczos';
import { applyPresetToImageData, CURATE_PRESETS } from '../engine/presets';
import { extractColorMetrics, applyHarmonizeSync } from '../engine/harmonize';
import { extractEdgeColors } from '../engine/edge-gradient';
import { ColorMetrics, PresetProfile } from '../core/types';
import { applyCorrections, CorrectionParams } from '../engine/corrections';

export type WorkerTaskType =
  | 'UPSCALE_LANCZOS'
  | 'APPLY_PRESET'
  | 'HARMONIZE_SYNC'
  | 'EXTRACT_METRICS'
  | 'ADAPTIVE_GRADIENT'
  | 'APPLY_CORRECTIONS';

export interface WorkerTaskRequest {
  taskId: string;
  type: WorkerTaskType;
  imageData?: ImageData;
  scaleFactor?: 2 | 4;
  presetId?: string;
  presetIntensity?: number;
  refMetrics?: ColorMetrics;
  harmonizeStrength?: number;
  corrections?: CorrectionParams;
  /** export pixels per render pixel (Düzeltme radii) */
  correctionScale?: number;
}

export interface WorkerTaskResponse {
  taskId: string;
  success: boolean;
  type: WorkerTaskType;
  resultImageData?: ImageData;
  colorMetrics?: ColorMetrics;
  adaptiveGradient?: any;
  error?: string;
}

// Worker message listener
if (typeof self !== 'undefined') {
  const ctx = self as unknown as {
    onmessage: ((event: MessageEvent<WorkerTaskRequest>) => void) | null;
    postMessage: (message: any, transfer?: Transferable[]) => void;
  };

  ctx.onmessage = (event: MessageEvent<WorkerTaskRequest>) => {
    const {
      taskId,
      type,
      imageData,
      scaleFactor,
      presetId,
      presetIntensity,
      refMetrics,
      harmonizeStrength,
      corrections,
      correctionScale,
    } = event.data;

    try {
      switch (type) {
        case 'APPLY_CORRECTIONS': {
          if (!imageData || !corrections) throw new Error('Missing imageData or corrections');
          const result = applyCorrections(imageData, corrections, correctionScale ?? 1);
          const response: WorkerTaskResponse = { taskId, success: true, type, resultImageData: result };
          ctx.postMessage(response, [result.data.buffer]);
          break;
        }

        case 'UPSCALE_LANCZOS': {
          if (!imageData || !scaleFactor) throw new Error('Missing imageData or scaleFactor');
          const result = upscaleLanczos3(imageData, scaleFactor);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            resultImageData: result,
          };
          ctx.postMessage(response, [result.data.buffer]);
          break;
        }

        case 'APPLY_PRESET': {
          if (!imageData || !presetId) throw new Error('Missing imageData or presetId');
          const preset = CURATE_PRESETS.find((p) => p.id === presetId);
          if (!preset) throw new Error(`Unknown preset: ${presetId}`);
          const result = applyPresetToImageData(imageData, preset, presetIntensity ?? 1.0);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            resultImageData: result,
          };
          ctx.postMessage(response, [result.data.buffer]);
          break;
        }

        case 'HARMONIZE_SYNC': {
          if (!imageData || !refMetrics) throw new Error('Missing imageData or refMetrics');
          const result = applyHarmonizeSync(imageData, refMetrics, harmonizeStrength ?? 0.20);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            resultImageData: result,
          };
          ctx.postMessage(response, [result.data.buffer]);
          break;
        }

        case 'EXTRACT_METRICS': {
          if (!imageData) throw new Error('Missing imageData');
          const metrics = extractColorMetrics(imageData);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            colorMetrics: metrics,
          };
          ctx.postMessage(response);
          break;
        }

        case 'ADAPTIVE_GRADIENT': {
          if (!imageData) throw new Error('Missing imageData');
          const gradient = extractEdgeColors(imageData);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            adaptiveGradient: gradient,
          };
          ctx.postMessage(response);
          break;
        }

        default:
          throw new Error(`Unsupported worker task: ${type}`);
      }
    } catch (err: any) {
      const response: WorkerTaskResponse = {
        taskId,
        success: false,
        type,
        error: err?.message || 'Worker processing error',
      };
      ctx.postMessage(response);
    }
  };
}
