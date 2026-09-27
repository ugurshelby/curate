/**
 * Curate Core — Web Worker Bridge
 * Manages async communication with image-processor.worker
 * Includes zero-crash in-thread fallback for environments without Worker support.
 */

import { upscaleLanczos3 } from '../engine/upscale-lanczos';
import { applyPresetToImageData, CURATE_PRESETS } from '../engine/presets';
import { extractColorMetrics, applyHarmonizeSync } from '../engine/harmonize';
import { extractAdaptiveGradient } from '../engine/adaptive-gradient';
import { ColorMetrics, AdaptiveGradientResult } from './types';
import {
  WorkerTaskRequest,
  WorkerTaskResponse,
  WorkerTaskType,
} from '../workers/image-processor.worker';

class WorkerBridge {
  private worker: Worker | null = null;
  private pendingTasks = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (err: any) => void;
    }
  >();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        // Modern Webpack/Next.js worker instantiation
        this.worker = new Worker(
          new URL('../workers/image-processor.worker.ts', import.meta.url)
        );

        this.worker.onmessage = (event: MessageEvent<WorkerTaskResponse>) => {
          const { taskId, success, error, resultImageData, colorMetrics, adaptiveGradient } =
            event.data;

          const pending = this.pendingTasks.get(taskId);
          if (!pending) return;

          this.pendingTasks.delete(taskId);

          if (!success) {
            pending.reject(new Error(error || 'Worker task failed'));
          } else {
            if (resultImageData) pending.resolve(resultImageData);
            else if (colorMetrics) pending.resolve(colorMetrics);
            else if (adaptiveGradient) pending.resolve(adaptiveGradient);
            else pending.resolve(null);
          }
        };

        this.worker.onerror = (err) => {
          console.warn('[WorkerBridge] Worker error, falling back to main-thread processing', err);
        };
      } catch (e) {
        console.warn('[WorkerBridge] Worker instantiation failed, using in-thread fallback', e);
        this.worker = null;
      }
    }
  }

  private postOrFallback<T>(
    type: WorkerTaskType,
    payload: Omit<WorkerTaskRequest, 'taskId' | 'type'>,
    fallbackFn: () => T
  ): Promise<T> {
    if (!this.worker) {
      // Direct in-thread execution fallback
      try {
        return Promise.resolve(fallbackFn());
      } catch (err) {
        return Promise.reject(err);
      }
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return new Promise<T>((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });

      const request: WorkerTaskRequest = {
        taskId,
        type,
        ...payload,
      };

      try {
        if (payload.imageData) {
          // Transfer buffer for maximum zero-copy performance
          this.worker!.postMessage(request, [payload.imageData.data.buffer]);
        } else {
          this.worker!.postMessage(request);
        }
      } catch (err) {
        // Fallback on serialization failure
        this.pendingTasks.delete(taskId);
        resolve(fallbackFn());
      }
    });
  }

  public async upscaleLanczos(imageData: ImageData, scaleFactor: 2 | 4): Promise<ImageData> {
    return this.postOrFallback(
      'UPSCALE_LANCZOS',
      { imageData, scaleFactor },
      () => upscaleLanczos3(imageData, scaleFactor)
    );
  }

  public async applyPreset(
    imageData: ImageData,
    presetId: string,
    intensity: number = 1.0
  ): Promise<ImageData> {
    return this.postOrFallback(
      'APPLY_PRESET',
      { imageData, presetId, presetIntensity: intensity },
      () => {
        const preset = CURATE_PRESETS.find((p) => p.id === presetId);
        if (!preset) throw new Error(`Unknown preset: ${presetId}`);
        return applyPresetToImageData(imageData, preset, intensity);
      }
    );
  }

  public async harmonizeSync(
    imageData: ImageData,
    refMetrics: ColorMetrics,
    strength: number = 0.20
  ): Promise<ImageData> {
    return this.postOrFallback(
      'HARMONIZE_SYNC',
      { imageData, refMetrics, harmonizeStrength: strength },
      () => applyHarmonizeSync(imageData, refMetrics, strength)
    );
  }

  public async extractMetrics(imageData: ImageData): Promise<ColorMetrics> {
    return this.postOrFallback(
      'EXTRACT_METRICS',
      { imageData },
      () => extractColorMetrics(imageData)
    );
  }

  public async extractGradient(imageData: ImageData): Promise<AdaptiveGradientResult> {
    return this.postOrFallback(
      'ADAPTIVE_GRADIENT',
      { imageData },
      () => extractAdaptiveGradient(imageData)
    );
  }
}

export const workerBridge = new WorkerBridge();
