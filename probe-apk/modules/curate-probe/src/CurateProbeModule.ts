import { NativeModule, requireNativeModule } from 'expo';

// Kotlin side: android/src/main/java/app/curate/probe/module/*.kt. Returned objects are plain JSON (numbers, strings, arrays, objects).
type Json = Record<string, unknown>;

declare class CurateProbeModule extends NativeModule<{}> {
  deviceInfo(): Promise<Json>;
  cameraCharacteristics(): Promise<{ listelenen: string[]; gizli: string[]; kameralar: Json[] }>;
  sampleSensors(durationMs: number): Promise<{ liste: Json[]; ölçüm: Record<string, Json>; süreSn: number }>;
  captureTests(): Promise<{ tests: Json[]; ek: Json }>;
}

export default requireNativeModule<CurateProbeModule>('CurateProbe');
