/**
 * Curate Engine — Dedicated Image Processing Web Worker
 * Offloads Lanczos-3 convolution and image processing filters
 * from the UI thread to maintain 60 FPS responsiveness.
 */

import { upscaleLanczos3 } from '../engine/upscale-lanczos';
import { extractEdgeColors } from '../engine/edge-gradient';
import { applyCorrections, CorrectionParams } from '../engine/corrections';

export type WorkerTaskType =
  | 'UPSCALE_LANCZOS'
  | 'ADAPTIVE_GRADIENT'
  | 'APPLY_CORRECTIONS';

export interface WorkerTaskRequest {
  taskId: string;
  type: WorkerTaskType;
  imageData?: ImageData;
  scaleFactor?: 2 | 4;
  corrections?: CorrectionParams;
  /** export pixels per render pixel (Düzeltme radii) */
  correctionScale?: number;
}

export interface WorkerTaskResponse {
  taskId: string;
  success: boolean;
  type: WorkerTaskType;
  resultImageData?: ImageData;
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

        case 'ADAPTIVE_GRADIENT': {
          if (!imageData) throw new Error('Missing imageData');
          const edgeColors = extractEdgeColors(imageData);
          const response: WorkerTaskResponse = {
            taskId,
            success: true,
            type,
            adaptiveGradient: edgeColors,
          };
          ctx.postMessage(response);
          break;
        }

        default:
          throw new Error(`Unknown worker task type: ${type}`);
      }
    } catch (err: any) {
      const response: WorkerTaskResponse = {
        taskId,
        success: false,
        type,
        error: err?.message || 'Worker processing failed',
      };
      ctx.postMessage(response);
    }
  };
}
