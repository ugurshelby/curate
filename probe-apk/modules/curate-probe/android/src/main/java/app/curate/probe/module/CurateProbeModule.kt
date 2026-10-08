package app.curate.probe.module

// Curate Probe: measurement only. No network, no image saved (docs/probe/README.md).
// No personal or identifying field is read: no Build.SERIAL, IMEI, account or location.

import android.app.ActivityManager
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.opengl.EGL14
import android.opengl.EGLConfig
import android.opengl.GLES20
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicInteger

class CurateProbeModule : Module() {
  private val ctx: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context yok")

  // https://docs.expo.dev/modules/module-api/ (AsyncFunction runs on a background queue)
  override fun definition() = ModuleDefinition {
    Name("CurateProbe")

    AsyncFunction<Map<String, Any?>>("deviceInfo") { deviceInfo(ctx) }

    AsyncFunction<Map<String, Any?>>("cameraCharacteristics") { CameraInfo.all(ctx) }

    AsyncFunction("sampleSensors") { durationMs: Int -> sampleSensors(ctx, durationMs) }

    AsyncFunction<Map<String, Any?>>("captureTests") { CaptureProbe(ctx).runAll() }
  }
}

private fun deviceInfo(ctx: Context): Map<String, Any?> {
  // https://developer.android.com/reference/android/app/ActivityManager.MemoryInfo
  val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
  val mem = ActivityManager.MemoryInfo()
  am.getMemoryInfo(mem)
  // https://developer.android.com/reference/android/os/PowerManager#getCurrentThermalStatus()
  val thermal = if (Build.VERSION.SDK_INT >= 29) {
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    when (pm.currentThermalStatus) {
      PowerManager.THERMAL_STATUS_NONE -> "yok"
      PowerManager.THERMAL_STATUS_LIGHT -> "hafif"
      PowerManager.THERMAL_STATUS_MODERATE -> "orta"
      PowerManager.THERMAL_STATUS_SEVERE -> "ağır"
      PowerManager.THERMAL_STATUS_CRITICAL -> "kritik"
      PowerManager.THERMAL_STATUS_EMERGENCY -> "acil"
      PowerManager.THERMAL_STATUS_SHUTDOWN -> "kapanma"
      else -> "bilinmiyor"
    }
  } else null
  // https://developer.android.com/reference/android/os/Build
  return mapOf(
    "manufacturer" to Build.MANUFACTURER,
    "brand" to Build.BRAND,
    "model" to Build.MODEL,
    "device" to Build.DEVICE,
    "product" to Build.PRODUCT,
    "hardware" to Build.HARDWARE,
    "display" to Build.DISPLAY,
    "incremental" to Build.VERSION.INCREMENTAL,
    "release" to Build.VERSION.RELEASE,
    "sdkInt" to Build.VERSION.SDK_INT,
    "securityPatch" to Build.VERSION.SECURITY_PATCH,
    "socManufacturer" to (if (Build.VERSION.SDK_INT >= 31) Build.SOC_MANUFACTURER else null),
    "socModel" to (if (Build.VERSION.SDK_INT >= 31) Build.SOC_MODEL else null),
    "abis" to Build.SUPPORTED_ABIS.toList(),
    "cores" to Runtime.getRuntime().availableProcessors(),
    "ramBytes" to mem.totalMem.toDouble(),
    "availRamBytes" to mem.availMem.toDouble(),
    "lowRamDevice" to am.isLowRamDevice,
    "memoryClassMb" to am.memoryClass,
    "largeMemoryClassMb" to am.largeMemoryClass,
    "thermal" to thermal,
    "gl" to glInfo(),
  )
}

/** GPU name: opens a tiny EGL pbuffer context and reads GL_RENDERER. The default display is not terminated (shared with HWUI). */
private fun glInfo(): Map<String, Any?> = try {
  // https://developer.android.com/reference/android/opengl/EGL14
  val dpy = EGL14.eglGetDisplay(EGL14.EGL_DEFAULT_DISPLAY)
  val ver = IntArray(2)
  if (!EGL14.eglInitialize(dpy, ver, 0, ver, 1)) {
    mapOf("hata" to "eglInitialize")
  } else {
    val attribs = intArrayOf(
      EGL14.EGL_RENDERABLE_TYPE, EGL14.EGL_OPENGL_ES2_BIT,
      EGL14.EGL_SURFACE_TYPE, EGL14.EGL_PBUFFER_BIT,
      EGL14.EGL_NONE,
    )
    val configs = arrayOfNulls<EGLConfig>(1)
    val num = IntArray(1)
    EGL14.eglChooseConfig(dpy, attribs, 0, configs, 0, 1, num, 0)
    if (num[0] == 0 || configs[0] == null) {
      mapOf("hata" to "EGL yapılandırması yok")
    } else {
      val context = EGL14.eglCreateContext(dpy, configs[0], EGL14.EGL_NO_CONTEXT, intArrayOf(EGL14.EGL_CONTEXT_CLIENT_VERSION, 2, EGL14.EGL_NONE), 0)
      val surface = EGL14.eglCreatePbufferSurface(dpy, configs[0], intArrayOf(EGL14.EGL_WIDTH, 1, EGL14.EGL_HEIGHT, 1, EGL14.EGL_NONE), 0)
      EGL14.eglMakeCurrent(dpy, surface, surface, context)
      // https://developer.android.com/reference/android/opengl/GLES20#glGetString(int)
      val maxTex = IntArray(1)
      GLES20.glGetIntegerv(GLES20.GL_MAX_TEXTURE_SIZE, maxTex, 0)
      val out = mapOf(
        "renderer" to GLES20.glGetString(GLES20.GL_RENDERER),
        "vendor" to GLES20.glGetString(GLES20.GL_VENDOR),
        "version" to GLES20.glGetString(GLES20.GL_VERSION),
        "maxTexture" to maxTex[0],
      )
      EGL14.eglMakeCurrent(dpy, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_SURFACE, EGL14.EGL_NO_CONTEXT)
      EGL14.eglDestroySurface(dpy, surface)
      EGL14.eglDestroyContext(dpy, context)
      out
    }
  }
} catch (e: Throwable) {
  mapOf("hata" to "${e.javaClass.simpleName}: ${e.message}")
}

/** Sensor list and measured event rate for selected sensors (SENSOR_DELAY_FASTEST). */
private fun sampleSensors(ctx: Context, durationMs: Int): Map<String, Any?> {
  // https://developer.android.com/reference/android/hardware/SensorManager
  val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  val list = sm.getSensorList(Sensor.TYPE_ALL).map {
    mapOf(
      "ad" to it.name,
      "üretici" to it.vendor,
      "tip" to it.stringType,
      "minGecikmeUs" to it.minDelay,
      "maxMenzil" to it.maximumRange.toDouble(),
      "çözünürlük" to it.resolution.toDouble(),
      "güçMa" to it.power.toDouble(),
    )
  }
  val targets = linkedMapOf(
    "ışık" to Sensor.TYPE_LIGHT,
    "ivmeölçer" to Sensor.TYPE_ACCELEROMETER,
    "jiroskop" to Sensor.TYPE_GYROSCOPE,
    "manyetometre" to Sensor.TYPE_MAGNETIC_FIELD,
    "basınç" to Sensor.TYPE_PRESSURE,
  )
  val thread = HandlerThread("curate-probe-sensors").apply { start() }
  val handler = Handler(thread.looper)
  class Rec(val sensor: Sensor) {
    val n = AtomicInteger(0)
    @Volatile var min = Float.MAX_VALUE
    @Volatile var max = -Float.MAX_VALUE
  }
  val recs = linkedMapOf<String, Rec>()
  val listeners = mutableListOf<SensorEventListener>()
  for ((name, type) in targets) {
    val s = sm.getDefaultSensor(type) ?: continue
    val rec = Rec(s)
    recs[name] = rec
    val l = object : SensorEventListener {
      override fun onSensorChanged(e: SensorEvent) {
        rec.n.incrementAndGet()
        val v = e.values[0]
        if (v < rec.min) rec.min = v
        if (v > rec.max) rec.max = v
      }
      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    sm.registerListener(l, s, SensorManager.SENSOR_DELAY_FASTEST, handler)
    listeners.add(l)
  }
  val t0 = System.nanoTime()
  Thread.sleep(durationMs.toLong())
  listeners.forEach { sm.unregisterListener(it) }
  val seconds = (System.nanoTime() - t0) / 1e9
  thread.quitSafely()
  val measured = targets.keys.associateWith { name ->
    val r = recs[name]
    if (r == null) mapOf("var" to false)
    else mapOf(
      "var" to true,
      "ad" to r.sensor.name,
      "hz" to Math.round(r.n.get() / seconds * 10) / 10.0,
      "olay" to r.n.get(),
      "minDeğer" to (if (r.n.get() > 0) r.min.toDouble() else null),
      "maxDeğer" to (if (r.n.get() > 0) r.max.toDouble() else null),
      "değişimdeBildirir" to (r.sensor.reportingMode == Sensor.REPORTING_MODE_ON_CHANGE),
    )
  }
  return mapOf("liste" to list, "ölçüm" to measured, "süreSn" to seconds)
}
