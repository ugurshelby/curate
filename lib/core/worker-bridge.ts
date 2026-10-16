/**
 * Curate Core — Web Worker Bridge
 * Manages async communication with image-processor.worker
 * Includes zero-crash in-thread fallback for environments without Worker support.
 */

import { upscaleLanczos3 } from '../engine/upscale-lanczos';
import { applyCorrections as applyCorrectionsSync, CorrectionParams } from '../engine/corrections';
import { extractEdgeColors, type EdgeColors } from '../engine/edge-gradient';
import {
  WorkerTaskRequest,
  WorkerTaskResponse,
  WorkerTaskType,
} from '../workers/image-processor.worker';

type WorkerLike = Pick<Worker, 'postMessage' | 'terminate'> & {
  onmessage: ((event: MessageEvent<WorkerTaskResponse>) => void) | null;
  onerror: ((event: ErrorEvent | Event) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
};

function defaultWorkerFactory(): WorkerLike | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  return new Worker(new URL('../workers/image-processor.worker.ts', import.meta.url)) as unknown as WorkerLike;
}

export class WorkerBridge {
  private worker: WorkerLike | null = null;
  private pendingTasks = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (err: any) => void;
    }
  >();

  constructor(private createWorker: () => WorkerLike | null = defaultWorkerFactory) {
    this.initWorker();
  }

  private failAll(reason: string) {
    const pending = [...this.pendingTasks.values()];
    this.pendingTasks.clear();
    try {
      this.worker?.terminate();
    } catch {
      /* zaten kapalı */
    }
    this.worker = null;
    pending.forEach((p) => p.reject(new Error(reason)));
  }

  private initWorker() {
    try {
      this.worker = this.createWorker();
      if (!this.worker) return;

      this.worker.onmessage = (event: MessageEvent<WorkerTaskResponse>) => {
        const { taskId, success, error, resultImageData, adaptiveGradient } = event.data;

        const pending = this.pendingTasks.get(taskId);
        if (!pending) return;

        this.pendingTasks.delete(taskId);

        if (!success) {
          pending.reject(new Error(error || 'Worker task failed'));
        } else {
          if (resultImageData) pending.resolve(resultImageData);
          else if (adaptiveGradient) pending.resolve(adaptiveGradient);
          else pending.resolve(null);
        }
      };

      this.worker.onerror = (err) => {
        console.warn('[WorkerBridge] Worker error, falling back to main-thread processing', err);
        this.failAll('İşlem yarıda kaldı (bellek yetmemiş olabilir).');
      };

      this.worker.onmessageerror = () => {
        this.failAll('İşlem sonucu okunamadı.');
      };
    } catch (e) {
      console.warn('[WorkerBridge] Worker instantiation failed, using in-thread fallback', e);
      this.worker = null;
    }
  }

  private postOrFallback<T>(
    type: WorkerTaskType,
    payload: Omit<WorkerTaskRequest, 'taskId' | 'type'>,
    fallbackFn: () => T
  ): Promise<T> {
    if (!this.worker) {
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
          this.worker!.postMessage(request, [payload.imageData.data.buffer]);
        } else {
          this.worker!.postMessage(request);
        }
      } catch {
        this.pendingTasks.delete(taskId);
        resolve(fallbackFn());
      }
    });
  }

  public async applyCorrections(imageData: ImageData, corrections: CorrectionParams, correctionScale: number): Promise<ImageData> {
    return this.postOrFallback<ImageData>(
      'APPLY_CORRECTIONS',
      { imageData, corrections, correctionScale },
      () => applyCorrectionsSync(imageData, corrections, correctionScale)
    );
  }

  public async upscaleLanczos(imageData: ImageData, scaleFactor: 2 | 4): Promise<ImageData> {
    return this.postOrFallback(
      'UPSCALE_LANCZOS',
      { imageData, scaleFactor },
      () => upscaleLanczos3(imageData, scaleFactor)
    );
  }

  public async extractGradient(imageData: ImageData): Promise<EdgeColors> {
    return this.postOrFallback(
      'ADAPTIVE_GRADIENT',
      { imageData },
      () => extractEdgeColors(imageData)
    );
  }
}

export const workerBridge = new WorkerBridge();
