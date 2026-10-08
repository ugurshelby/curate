package app.curate.probe.module

// Camera2 characteristics: the part readable without permission (getCameraCharacteristics needs no camera permission).
// https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics

import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.params.StreamConfigurationMap
import android.os.Build
import android.util.Size

internal object CameraInfo {
  private val HW_LEVEL = mapOf(
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY to "LEGACY",
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED to "LIMITED",
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_FULL to "FULL",
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_3 to "LEVEL_3",
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_EXTERNAL to "EXTERNAL",
  )

  // https://developer.android.com/reference/android/hardware/camera2/CameraMetadata#REQUEST_AVAILABLE_CAPABILITIES_BACKWARD_COMPATIBLE (constant values)
  private val CAPABILITIES = mapOf(
    0 to "BACKWARD_COMPATIBLE", 1 to "MANUAL_SENSOR", 2 to "MANUAL_POST_PROCESSING", 3 to "RAW",
    4 to "PRIVATE_REPROCESSING", 5 to "READ_SENSOR_SETTINGS", 6 to "BURST_CAPTURE", 7 to "YUV_REPROCESSING",
    8 to "DEPTH_OUTPUT", 9 to "CONSTRAINED_HIGH_SPEED_VIDEO", 10 to "MOTION_TRACKING", 11 to "LOGICAL_MULTI_CAMERA",
    12 to "MONOCHROME", 13 to "SECURE_IMAGE_DATA", 14 to "SYSTEM_CAMERA", 15 to "OFFLINE_PROCESSING",
    16 to "ULTRA_HIGH_RESOLUTION_SENSOR", 17 to "REMOSAIC_REPROCESSING", 18 to "DYNAMIC_RANGE_TEN_BIT",
    19 to "STREAM_USE_CASE", 20 to "COLOR_SPACE_PROFILES",
  )

  // https://developer.android.com/reference/android/hardware/camera2/CameraExtensionCharacteristics#EXTENSION_AUTOMATIC
  private val EXTENSIONS = mapOf(0 to "AUTOMATIC", 1 to "FACE_RETOUCH", 2 to "BOKEH", 3 to "HDR", 4 to "NIGHT")

  fun capabilityNames(c: CameraCharacteristics): List<String> =
    (safe { c.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES) } ?: IntArray(0)).map { CAPABILITIES[it] ?: "CAP_$it" }

  fun all(ctx: Context): Map<String, Any?> {
    // https://developer.android.com/reference/android/hardware/camera2/CameraManager#getCameraIdList()
    val cm = ctx.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    val listed = cm.cameraIdList.toList()
    val seen = linkedSetOf<String>()
    val out = mutableListOf<Map<String, Any?>>()
    for (id in listed) if (seen.add(id)) out.add(describe(cm, id, "liste"))
    // https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#getPhysicalCameraIds()
    if (Build.VERSION.SDK_INT >= 28) {
      for (id in listed) {
        val phys = safe { cm.getCameraCharacteristics(id).physicalCameraIds } ?: emptySet()
        for (p in phys) if (seen.add(p)) out.add(describe(cm, p, "fiziksel:$id"))
      }
    }
    // Vendor restriction question: are characteristics readable for ids missing from the list (0–15)
    val hidden = mutableListOf<String>()
    for (i in 0..15) {
      val id = i.toString()
      if (id in seen) continue
      val ok = try {
        cm.getCameraCharacteristics(id)
        true
      } catch (e: Exception) {
        false
      }
      if (ok) {
        seen.add(id)
        hidden.add(id)
        out.add(describe(cm, id, "gizli"))
      }
    }
    return mapOf("listelenen" to listed, "gizli" to hidden, "kameralar" to out)
  }

  private fun sizes(map: StreamConfigurationMap?, format: Int, high: Boolean = false): List<String> {
    // https://developer.android.com/reference/android/hardware/camera2/params/StreamConfigurationMap#getOutputSizes(int)
    val arr: Array<Size>? = safe { if (high) map?.getHighResolutionOutputSizes(format) else map?.getOutputSizes(format) }
    return (arr ?: emptyArray()).sortedByDescending { it.width.toLong() * it.height }.take(12).map { "${it.width}x${it.height}" }
  }

  private fun describe(cm: CameraManager, id: String, source: String): Map<String, Any?> = try {
    val c = cm.getCameraCharacteristics(id)
    fun <T> k(key: CameraCharacteristics.Key<T>): T? = safe { c.get(key) }
    val map = k(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
    val facing = when (k(CameraCharacteristics.LENS_FACING)) {
      CameraMetadata.LENS_FACING_BACK -> "arka"
      CameraMetadata.LENS_FACING_FRONT -> "ön"
      CameraMetadata.LENS_FACING_EXTERNAL -> "harici"
      else -> "bilinmiyor"
    }
    val iso = k(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
    val exp = k(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
    val aeRange = k(CameraCharacteristics.CONTROL_AE_COMPENSATION_RANGE)
    val phys = k(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
    val pix = k(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
    val out = linkedMapOf<String, Any?>(
      "kimlik" to id,
      "kaynak" to source,
      "yön" to facing,
      "donanımSeviyesi" to k(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)?.let { HW_LEVEL[it] ?: "LEVEL_$it" },
      "yetenekler" to capabilityNames(c),
      "isoAralığı" to iso?.let { listOf(it.lower, it.upper) },
      "maxAnalogIso" to k(CameraCharacteristics.SENSOR_MAX_ANALOG_SENSITIVITY),
      "pozlamaAralığıNs" to exp?.let { listOf(it.lower.toDouble(), it.upper.toDouble()) },
      "maxKareSüresiNs" to k(CameraCharacteristics.SENSOR_INFO_MAX_FRAME_DURATION)?.toDouble(),
      "evAralığı" to aeRange?.let { listOf(it.lower, it.upper) },
      "evAdımı" to k(CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP)?.toDouble(),
      "minOdakDiyoptri" to k(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)?.toDouble(),
      "hiperfokalDiyoptri" to k(CameraCharacteristics.LENS_INFO_HYPERFOCAL_DISTANCE)?.toDouble(),
      "odakUzunluklarıMm" to k(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)?.map { it.toDouble() },
      "diyaframlar" to k(CameraCharacteristics.LENS_INFO_AVAILABLE_APERTURES)?.map { it.toDouble() },
      "ois" to k(CameraCharacteristics.LENS_INFO_AVAILABLE_OPTICAL_STABILIZATION)?.toList(),
      "sensörBoyutuMm" to phys?.let { listOf(it.width.toDouble(), it.height.toDouble()) },
      "pikselDizisi" to pix?.let { listOf(it.width, it.height) },
      "sensörYönü" to k(CameraCharacteristics.SENSOR_ORIENTATION),
      "maxDijitalZoom" to k(CameraCharacteristics.SCALER_AVAILABLE_MAX_DIGITAL_ZOOM)?.toDouble(),
      "flaş" to k(CameraCharacteristics.FLASH_INFO_AVAILABLE),
      "aeModları" to k(CameraCharacteristics.CONTROL_AE_AVAILABLE_MODES)?.toList(),
      "afModları" to k(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES)?.toList(),
      "awbModları" to k(CameraCharacteristics.CONTROL_AWB_AVAILABLE_MODES)?.toList(),
      "maxAeBölgesi" to k(CameraCharacteristics.CONTROL_MAX_REGIONS_AE),
      "fpsAralıkları" to k(CameraCharacteristics.CONTROL_AE_AVAILABLE_TARGET_FPS_RANGES)?.map { "${it.lower}-${it.upper}" },
      "jpegBoyutları" to sizes(map, ImageFormat.JPEG),
      "jpegYüksekÇözünürlük" to sizes(map, ImageFormat.JPEG, high = true),
      "rawBoyutları" to sizes(map, ImageFormat.RAW_SENSOR),
      "yuvBoyutları" to sizes(map, ImageFormat.YUV_420_888),
    )
    // https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#CONTROL_ZOOM_RATIO_RANGE
    if (Build.VERSION.SDK_INT >= 30) {
      out["zoomOranıAralığı"] = k(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE)?.let { listOf(it.lower.toDouble(), it.upper.toDouble()) }
    }
    if (Build.VERSION.SDK_INT >= 28) out["fizikselKimlikler"] = safe { c.physicalCameraIds.toList() }
    if (Build.VERSION.SDK_INT >= 31) {
      // https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION
      val maxMap = k(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)
      out["jpegMaksimumÇözünürlük"] = sizes(maxMap, ImageFormat.JPEG)
      out["rawMaksimumÇözünürlük"] = sizes(maxMap, ImageFormat.RAW_SENSOR)
      // https://developer.android.com/reference/android/hardware/camera2/CameraManager#getCameraExtensionCharacteristics(java.lang.String)
      out["uzantılar"] = safe { cm.getCameraExtensionCharacteristics(id).supportedExtensions.map { EXTENSIONS[it] ?: "EXT_$it" } }
    }
    out
  } catch (e: Throwable) {
    mapOf("kimlik" to id, "kaynak" to source, "hata" to "${e.javaClass.simpleName}: ${e.message}")
  }
}

internal inline fun <T> safe(block: () -> T): T? = try {
  block()
} catch (e: Throwable) {
  null
}
