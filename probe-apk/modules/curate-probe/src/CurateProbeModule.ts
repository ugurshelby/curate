import { NativeModule, requireNativeModule } from 'expo';

// Kotlin tarafı: android/src/main/java/app/curate/probe/module/*.kt. Dönen nesneler düz JSON (sayı, metin, dizi, nesne).
type Json = Record<string, unknown>;

declare class CurateProbeModule extends NativeModule<{}> {
  deviceInfo(): Promise<Json>;
  cameraCharacteristics(): Promise<{ listelenen: string[]; gizli: string[]; kameralar: Json[] }>;
  sampleSensors(durationMs: number): Promise<{ liste: Json[]; ölçüm: Record<string, Json>; süreSn: number }>;
  captureTests(): Promise<{ tests: Json[]; ek: Json }>;
}

export default requireNativeModule<CurateProbeModule>('CurateProbe');
