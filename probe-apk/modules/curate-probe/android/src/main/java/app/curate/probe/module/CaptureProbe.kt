package app.curate.probe.module

// Canlı yakalama testleri (arka ana kamera, Camera2). Görüntüler KAYDEDİLMEZ: her kare 160 px'e küçültülüp
// yalnız sayıya çevrilir ve hemen kapatılır; RAW/DNG yalnız bellekte oluşturulup boyutu ölçülür.
// Her adım kendi try/catch'inde: bir adım çökerse diğerleri sürer, durum "hata" olur.
// https://developer.android.com/reference/android/hardware/camera2/package-summary

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraMetadata
import android.hardware.camera2.CaptureFailure
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.CaptureResult
import android.hardware.camera2.DngCreator
import android.hardware.camera2.TotalCaptureResult
import android.hardware.camera2.params.MeteringRectangle
import android.media.Image
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.util.Size
import android.view.Surface
import java.io.ByteArrayOutputStream
import java.util.Collections
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

// lib/probe/schema.ts EFFECT_MIN ile aynı eşikler (web ile eşleşmeli)
private const val MIN_LUMA_DELTA = 8.0
private const val MIN_RATIO_DELTA = 0.06
private const val MIN_SHARP_REL = 0.2

private fun now() = SystemClock.elapsedRealtime()
private fun r1(v: Double) = Math.round(v * 10) / 10.0
private fun r3(v: Double) = Math.round(v * 1000) / 1000.0

private class Stats(val luma: Double, val rOran: Double, val bOran: Double, val keskinlik: Double, val solUst: Double, val sagAlt: Double) {
  fun toMap(): Map<String, Any?> = mapOf(
    "parlaklık" to r1(luma), "rOran" to r3(rOran), "bOran" to r3(bOran),
    "keskinlik" to r3(keskinlik), "solÜst" to r1(solUst), "sağAlt" to r1(sagAlt),
  )
}

private class Shot(
  val ms: Long, val w: Int, val h: Int, val bytes: Int, val stats: Stats?,
  val iso: Int?, val expNs: Long?, val focus: Float?, val extra: Map<String, Any?>,
)

/** JPEG → ≈160 px bitmap → parlaklık, R/G, B/G, Laplace keskinliği, çeyrek parlaklıkları. Bitmap hemen geri verilir. */
private fun jpegStats(bytes: ByteArray): Stats {
  // https://developer.android.com/reference/android/graphics/BitmapFactory.Options#inSampleSize
  val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
  var sample = 1
  while (bounds.outWidth / (sample * 2) >= 160) sample *= 2
  val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
    ?: throw IllegalStateException("JPEG çözülemedi")
  try {
    val w = bmp.width
    val h = bmp.height
    val px = IntArray(w * h)
    bmp.getPixels(px, 0, w, 0, 0, w, h)
    val l = DoubleArray(w * h)
    var sr = 0.0; var sg = 0.0; var sb = 0.0; var sl = 0.0
    var tl = 0.0; var tlN = 0; var br = 0.0; var brN = 0
    for (y in 0 until h) for (x in 0 until w) {
      val i = y * w + x
      val p = px[i]
      val r = (p shr 16) and 255
      val g = (p shr 8) and 255
      val b = p and 255
      val lv = 0.299 * r + 0.587 * g + 0.114 * b
      l[i] = lv
      sr += r; sg += g; sb += b; sl += lv
      if (x < w / 2 && y < h / 2) { tl += lv; tlN++ } else if (x >= w - w / 2 && y >= h - h / 2) { br += lv; brN++ }
    }
    var lap = 0.0
    var lapN = 0
    for (y in 1 until h - 1) for (x in 1 until w - 1) {
      val i = y * w + x
      lap += abs(4 * l[i] - l[i - 1] - l[i + 1] - l[i - w] - l[i + w])
      lapN++
    }
    val n = (w * h).toDouble()
    val mg = max(sg / n, 1.0)
    return Stats(sl / n, (sr / n) / mg, (sb / n) / mg, if (lapN > 0) lap / lapN else 0.0, if (tlN > 0) tl / tlN else 0.0, if (brN > 0) br / brN else 0.0)
  } finally {
    bmp.recycle()
  }
}

internal class CaptureProbe(private val ctx: Context) {
  private val cm = ctx.getSystemService(Context.CAMERA_SERVICE) as CameraManager
  private val thread = HandlerThread("curate-probe-camera").apply { start() }
  private val handler = Handler(thread.looper)
  private val tests = mutableListOf<Map<String, Any?>>()
  private val extra = linkedMapOf<String, Any?>()
  private var device: CameraDevice? = null
  private var session: CameraCaptureSession? = null
  private var preview: ImageReader? = null
  private var jpeg: ImageReader? = null
  private var raw: ImageReader? = null
  private lateinit var chars: CameraCharacteristics
  private var caps: List<String> = emptyList()
  private val lastPreview = AtomicReference<TotalCaptureResult?>(null)
  private var autoIso: Int? = null
  private var autoExpNs: Long? = null

  private val steps = listOf(
    "native.otomatik" to "Otomatik JPEG çekimi",
    "native.manuel" to "Manuel ISO + pozlama süresi (AE kapalı)",
    "native.braket" to "EV −2/0/+2 braketi (AE telafisi)",
    "native.braketBurst" to "Manuel pozlama burst braketi (captureBurst)",
    "native.noktaPozlama" to "Nokta pozlama (AE bölgesi)",
    "native.beyazDengesi" to "Beyaz dengesi ön ayarları (akkor / bulutlu)",
    "native.odak" to "Manuel odak (AF kapalı)",
    "native.raw" to "RAW_SENSOR / DNG çekimi",
  )

  fun runAll(): Map<String, Any?> {
    try {
      if (ctx.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
        add("native.oturum", "Camera2 oturumu (arka ana kamera)", "hata", "kamera izni verilmedi", null, 0)
        steps.forEach { (id, ad) -> add(id, ad, "atlandı", "kamera izni yok", null, 0) }
        return result()
      }
      // https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#LENS_FACING
      val id = cm.cameraIdList.firstOrNull {
        safe { cm.getCameraCharacteristics(it).get(CameraCharacteristics.LENS_FACING) } == CameraMetadata.LENS_FACING_BACK
      }
      if (id == null) {
        add("native.oturum", "Camera2 oturumu (arka ana kamera)", "yok", "listede arka kamera yok", null, 0)
        steps.forEach { (sid, ad) -> add(sid, ad, "atlandı", "arka kamera yok", null, 0) }
        return result()
      }
      chars = cm.getCameraCharacteristics(id)
      caps = CameraInfo.capabilityNames(chars)
      extra["kameraKimliği"] = id
      extra["yetenekler"] = caps
      var opened = false
      step("native.oturum", "Camera2 oturumu (arka ana kamera)") {
        val detail = open(id)
        opened = true
        Triple("var", detail, null)
      }
      if (!opened) {
        steps.forEach { (sid, ad) -> add(sid, ad, "atlandı", "Camera2 oturumu açılamadı", null, 0) }
        return result()
      }
      runSteps()
    } finally {
      close()
    }
    return result()
  }

  private fun runSteps() {
    step("native.otomatik", steps[0].second) {
      val conv = settle({ autoAe(it) })
      val s = still(jpeg!!, { autoAe(it); it.set(CaptureRequest.JPEG_QUALITY, 95.toByte()) })
      autoIso = s.iso
      autoExpNs = s.expNs
      Triple(
        "var",
        "${s.w}×${s.h}, ${s.bytes / 1024} KB, ${s.ms} ms; otomatik pozlama ISO ${s.iso}, ${expText(s.expNs)}",
        mapOf("boyut" to listOf(s.w, s.h), "bayt" to s.bytes, "ms" to s.ms.toDouble(), "yakınsamaMs" to conv.toDouble(), "iso" to s.iso, "pozlamaNs" to s.expNs?.toDouble()) + s.stats!!.toMap(),
      )
    }

    step("native.manuel", steps[1].second) {
      if ("MANUAL_SENSOR" !in caps) return@step Triple("yok", "MANUAL_SENSOR yeteneği yok: bu kamera üçüncü taraf uygulamaya manuel ISO/pozlama vermiyor (${level()})", mapOf("yetenekler" to caps))
      val isoR = chars.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)!!
      val expR = chars.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)!!
      val baseIso = autoIso ?: 200
      val baseExp = autoExpNs ?: 16_666_666L
      // Koyu: ISO/2 + süre/2; aydınlık: ISO×2 + süre×2 (≈ 4 EV fark)
      val plan = listOf(baseIso / 2 to baseExp / 2, baseIso * 2 to min(baseExp * 2, 100_000_000L))
        .map { (i, e) -> i.coerceIn(isoR.lower, isoR.upper) to e.coerceIn(expR.lower, expR.upper) }
      val shots = plan.map { (i, e) -> still(jpeg!!, { manual(it, i, e) }) }
      val d = shots[1].stats!!.luma - shots[0].stats!!.luma
      val matched = shots.zip(plan).all { (s, p) ->
        val si = s.iso
        val se = s.expNs
        si != null && se != null && abs(si - p.first) <= max(1, p.first / 10) && abs(se - p.second) <= p.second / 10
      }
      val durum = if (abs(d) >= MIN_LUMA_DELTA) "etkili" else "kabul-edildi-etkisiz"
      Triple(
        durum,
        "istek ISO ${plan[0].first}/${expText(plan[0].second)} → ${plan[1].first}/${expText(plan[1].second)}; sonuç ISO ${shots[0].iso}/${shots[1].iso}; parlaklık ${r1(shots[0].stats!!.luma)} → ${r1(shots[1].stats!!.luma)}; sonuç meta verisi ${if (matched) "isteği izliyor" else "isteği İZLEMİYOR"}",
        mapOf(
          "istek" to plan.map { mapOf("iso" to it.first, "pozlamaNs" to it.second.toDouble()) },
          "sonuç" to shots.map { mapOf("iso" to it.iso, "pozlamaNs" to it.expNs?.toDouble(), "parlaklık" to r1(it.stats!!.luma), "ms" to it.ms.toDouble()) },
          "fark" to r1(abs(d)),
          "metaVeriEşleşti" to matched,
        ),
      )
    }

    step("native.braket", steps[2].second) {
      val range = chars.get(CameraCharacteristics.CONTROL_AE_COMPENSATION_RANGE)
      val stepEv = chars.get(CameraCharacteristics.CONTROL_AE_COMPENSATION_STEP)?.toDouble()
      if (range == null || stepEv == null || stepEv <= 0 || range.lower == range.upper) return@step Triple("yok", "AE telafisi aralığı yok", null)
      val t0 = now()
      val rows = mutableListOf<Map<String, Any?>>()
      val ends = mutableListOf<Long>()
      val lumas = mutableListOf<Double>()
      try {
        for (ev in listOf(-2.0, 0.0, 2.0)) {
          val idx = (ev / stepEv).roundToInt().coerceIn(range.lower, range.upper)
          val conv = settle({ autoAe(it); it.set(CaptureRequest.CONTROL_AE_EXPOSURE_COMPENSATION, idx) }) {
            it.get(CaptureResult.CONTROL_AE_EXPOSURE_COMPENSATION) == idx
          }
          val s = still(jpeg!!, { autoAe(it); it.set(CaptureRequest.CONTROL_AE_EXPOSURE_COMPENSATION, idx) })
          ends.add(now() - t0)
          lumas.add(s.stats!!.luma)
          rows.add(mapOf("ev" to r3(idx * stepEv), "yakınsamaMs" to conv.toDouble(), "çekimMs" to s.ms.toDouble(), "iso" to s.iso, "pozlamaNs" to s.expNs?.toDouble(), "parlaklık" to r1(s.stats.luma)))
        }
      } finally {
        safe { settle({ autoAe(it) }) }
      }
      val gaps = ends.zipWithNext { a, b -> (b - a).toDouble() }
      val d = lumas.last() - lumas.first()
      Triple(
        if (abs(d) >= MIN_LUMA_DELTA) "etkili" else "kabul-edildi-etkisiz",
        "kareler arası ${gaps.map { it.toLong() }.joinToString(" / ")} ms (yakınsama dahil); parlaklık ${lumas.joinToString(" / ") { r1(it).toString() }}",
        mapOf("kareler" to rows, "karelerArasıMs" to gaps, "toplamMs" to (now() - t0).toDouble(), "fark" to r1(abs(d))),
      )
    }

    step("native.braketBurst", steps[3].second) {
      if ("MANUAL_SENSOR" !in caps) return@step Triple("yok", "MANUAL_SENSOR yok: manuel pozlamalı burst yapılamaz", null)
      val isoR = chars.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)!!
      val expR = chars.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)!!
      val iso = (autoIso ?: 200).coerceIn(isoR.lower, isoR.upper)
      val base = autoExpNs ?: 16_666_666L
      val exps = listOf(base / 4, base, min(base * 4, 200_000_000L)).map { it.coerceIn(expR.lower, expR.upper) }
      val reader = jpeg!!
      drain(reader)
      val latch = CountDownLatch(exps.size)
      val got = Collections.synchronizedList(mutableListOf<Pair<Long, Stats?>>())
      reader.setOnImageAvailableListener({ r ->
        val img = safe { r.acquireNextImage() }
        if (img != null) {
          try {
            val buf = img.planes[0].buffer
            val bytes = ByteArray(buf.remaining())
            buf.get(bytes)
            got.add(img.timestamp to safe { jpegStats(bytes) })
          } finally {
            img.close()
            latch.countDown()
          }
        }
      }, handler)
      val t0 = now()
      try {
        val requests = exps.map { e ->
          device!!.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
            addTarget(reader.surface)
            manual(this, iso, e)
          }.build()
        }
        // https://developer.android.com/reference/android/hardware/camera2/CameraCaptureSession#captureBurst(java.util.List%3Candroid.hardware.camera2.CaptureRequest%3E,%20android.hardware.camera2.CameraCaptureSession.CaptureCallback,%20android.os.Handler)
        session!!.captureBurst(requests, null, handler)
        await(latch, 15000, "burst")
      } finally {
        reader.setOnImageAvailableListener(null, null)
      }
      val total = now() - t0
      val sorted = got.sortedBy { it.first }
      val gaps = sorted.zipWithNext { a, b -> r1((b.first - a.first) / 1e6) }
      val lumas = sorted.map { it.second?.luma ?: Double.NaN }
      val d = lumas.last() - lumas.first()
      Triple(
        if (abs(d) >= MIN_LUMA_DELTA) "etkili" else "kabul-edildi-etkisiz",
        "3 kare ${total} ms; sensör zaman damgası arası ${gaps.joinToString(" / ")} ms; parlaklık ${lumas.joinToString(" / ") { r1(it).toString() }}",
        mapOf("pozlamaNs" to exps.map { it.toDouble() }, "iso" to iso, "toplamMs" to total.toDouble(), "kareArasıMs" to gaps, "parlaklık" to lumas.map { r1(it) }, "fark" to r1(abs(d))),
      )
    }

    step("native.noktaPozlama", steps[4].second) {
      val maxRegions = chars.get(CameraCharacteristics.CONTROL_MAX_REGIONS_AE) ?: 0
      if (maxRegions < 1) return@step Triple("yok", "CONTROL_MAX_REGIONS_AE = 0: AE bölgesi desteklenmiyor", null)
      val a = chars.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)!!
      val w = a.width() / 4
      val h = a.height() / 4
      // https://developer.android.com/reference/android/hardware/camera2/params/MeteringRectangle
      val regions = listOf(
        "solÜst" to MeteringRectangle(a.left, a.top, w, h, MeteringRectangle.METERING_WEIGHT_MAX),
        "sağAlt" to MeteringRectangle(a.right - w, a.bottom - h, w, h, MeteringRectangle.METERING_WEIGHT_MAX),
      )
      val shots = try {
        regions.map { (_, r) ->
          settle({ autoAe(it); it.set(CaptureRequest.CONTROL_AE_REGIONS, arrayOf(r)) })
          still(jpeg!!, { autoAe(it); it.set(CaptureRequest.CONTROL_AE_REGIONS, arrayOf(r)) })
        }
      } finally {
        safe { settle({ autoAe(it) }) }
      }
      val d = shots[0].stats!!.luma - shots[1].stats!!.luma
      Triple(
        if (abs(d) >= MIN_LUMA_DELTA) "etkili" else "kabul-edildi-etkisiz",
        "AE bölgesi sol-üst → sağ-alt (sensör koordinatı): parlaklık ${r1(shots[0].stats!!.luma)} → ${r1(shots[1].stats!!.luma)} (sahnede aydınlık/karanlık bölge gerekir)",
        mapOf("bölgeler" to regions.indices.map { mapOf("bölge" to regions[it].first, "iso" to shots[it].iso, "pozlamaNs" to shots[it].expNs?.toDouble()) + shots[it].stats!!.toMap() }, "fark" to r1(abs(d))),
      )
    }

    step("native.beyazDengesi", steps[5].second) {
      val modes = chars.get(CameraCharacteristics.CONTROL_AWB_AVAILABLE_MODES)?.toList() ?: emptyList()
      val pair = listOf(CameraMetadata.CONTROL_AWB_MODE_INCANDESCENT, CameraMetadata.CONTROL_AWB_MODE_CLOUDY_DAYLIGHT)
      if (!modes.containsAll(pair)) return@step Triple("yok", "AWB ön ayarları yok (${modes})", null)
      val shots = try {
        pair.map { m ->
          settle({ autoAe(it); it.set(CaptureRequest.CONTROL_AWB_MODE, m) })
          still(jpeg!!, { autoAe(it); it.set(CaptureRequest.CONTROL_AWB_MODE, m) })
        }
      } finally {
        safe { settle({ autoAe(it) }) }
      }
      val a = shots[0].stats!!
      val b = shots[1].stats!!
      val d = max(abs(a.bOran - b.bOran), abs(a.rOran - b.rOran))
      val manualGains = "MANUAL_POST_PROCESSING" in caps
      Triple(
        if (d >= MIN_RATIO_DELTA) "etkili" else "kabul-edildi-etkisiz",
        "akkor → bulutlu: B/G ${r3(a.bOran)} → ${r3(b.bOran)}, R/G ${r3(a.rOran)} → ${r3(b.rOran)}; manuel renk kazancı (MANUAL_POST_PROCESSING) ${if (manualGains) "var" else "yok"}",
        mapOf("akkor" to a.toMap(), "bulutlu" to b.toMap(), "fark" to r3(d), "manuelRenkKazancı" to manualGains),
      )
    }

    step("native.odak", steps[6].second) {
      val minF = chars.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE) ?: 0f
      val af = chars.get(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES)?.toList() ?: emptyList()
      if (minF <= 0f || CameraMetadata.CONTROL_AF_MODE_OFF !in af) return@step Triple("yok", "sabit odak ya da AF kapatılamıyor (min odak $minF diyoptri)", null)
      val dists = listOf(0f, minF)
      val shots = try {
        dists.map { dist ->
          val cfg: (CaptureRequest.Builder) -> Unit = {
            autoAe(it)
            it.set(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_OFF)
            it.set(CaptureRequest.LENS_FOCUS_DISTANCE, dist)
          }
          settle(cfg)
          Thread.sleep(300)
          still(jpeg!!, cfg)
        }
      } finally {
        safe { settle({ autoAe(it) }) }
      }
      val k = shots.map { it.stats!!.keskinlik }
      val mean = max((k[0] + k[1]) / 2, 1e-6)
      val rel = abs(k[1] - k[0]) / mean
      Triple(
        if (rel >= MIN_SHARP_REL) "etkili" else "kabul-edildi-etkisiz",
        "sonsuz → en yakın ($minF D): keskinlik ${r3(k[0])} → ${r3(k[1])} (göreli ${r3(rel)}); sonuç odak ${shots[0].focus} → ${shots[1].focus} D",
        mapOf("istekDiyoptri" to dists.map { it.toDouble() }, "sonuçDiyoptri" to shots.map { it.focus?.toDouble() }, "keskinlik" to k.map { r3(it) }, "göreliFark" to r3(rel)),
      )
    }

    step("native.raw", steps[7].second) {
      val reader = raw ?: return@step if ("RAW" in caps) {
        Triple("hata", "RAW yeteneği var ama RAW akışlı oturum kurulamadı (bkz. native.oturum)", mapOf("yetenekler" to caps))
      } else {
        Triple("yok", "RAW yeteneği yok: bu kamera üçüncü taraf uygulamaya RAW vermiyor (${level()})", mapOf("yetenekler" to caps))
      }
      val s = still(reader, { autoAe(it) }) { image, result ->
        try {
          val t = now()
          val out = ByteArrayOutputStream()
          // https://developer.android.com/reference/android/hardware/camera2/DngCreator#writeImage(java.io.OutputStream,%20android.media.Image)
          val dng = DngCreator(chars, result)
          try {
            dng.writeImage(out, image)
          } finally {
            dng.close()
          }
          mapOf("dngBayt" to out.size(), "dngMs" to (now() - t).toDouble())
        } catch (e: Throwable) {
          mapOf("dngHata" to "${e.javaClass.simpleName}: ${e.message}")
        }
      }
      val dngBytes = s.extra["dngBayt"] as? Int
      Triple(
        "var",
        "RAW ${s.w}×${s.h}, ham ${s.bytes / 1048576} MB, ${s.ms} ms; DNG ${dngBytes?.let { "${it / 1048576} MB, ${(s.extra["dngMs"] as Double).toLong()} ms" } ?: (s.extra["dngHata"] ?: "?")}",
        mapOf("boyut" to listOf(s.w, s.h), "hamBayt" to s.bytes, "ms" to s.ms.toDouble()) + s.extra,
      )
    }
  }

  // ---------- yardımcılar ----------

  private fun level(): String = when (chars.get(CameraCharacteristics.INFO_SUPPORTED_HARDWARE_LEVEL)) {
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_LEGACY -> "donanım seviyesi LEGACY"
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_LIMITED -> "donanım seviyesi LIMITED"
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_FULL -> "donanım seviyesi FULL"
    CameraMetadata.INFO_SUPPORTED_HARDWARE_LEVEL_3 -> "donanım seviyesi LEVEL_3"
    else -> "donanım seviyesi ?"
  }

  private fun expText(ns: Long?): String = if (ns == null) "?" else if (ns >= 1_000_000) "${r1(ns / 1e6)} ms" else "${r1(ns / 1e3)} µs"

  private fun add(id: String, ad: String, durum: String, ayrinti: String, olcum: Any?, ms: Long) {
    tests.add(mapOf("id" to id, "ad" to ad, "durum" to durum, "ayrıntı" to ayrinti, "ölçüm" to olcum, "süreMs" to ms.toDouble()))
  }

  private inline fun step(id: String, ad: String, block: () -> Triple<String, String, Any?>) {
    val t0 = now()
    try {
      val (durum, ayrinti, olcum) = block()
      add(id, ad, durum, ayrinti, olcum, now() - t0)
    } catch (e: Throwable) {
      add(id, ad, "hata", "${e.javaClass.simpleName}: ${e.message}", null, now() - t0)
    }
  }

  private fun result(): Map<String, Any?> = mapOf("tests" to tests, "ek" to extra)

  private fun await(latch: CountDownLatch, ms: Long, label: String) {
    if (!latch.await(ms, TimeUnit.MILLISECONDS)) throw TimeoutException("$label $ms ms içinde gelmedi")
  }

  private fun drain(reader: ImageReader) {
    while (true) {
      val img = safe { reader.acquireLatestImage() } ?: break
      img.close()
    }
  }

  private fun afContinuous(b: CaptureRequest.Builder) {
    val af = chars.get(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES)?.toList() ?: return
    if (CameraMetadata.CONTROL_AF_MODE_CONTINUOUS_PICTURE in af) b.set(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
  }

  // https://developer.android.com/reference/android/hardware/camera2/CaptureRequest#CONTROL_AE_MODE
  private fun autoAe(b: CaptureRequest.Builder) {
    b.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO)
    b.set(CaptureRequest.CONTROL_AE_MODE, CameraMetadata.CONTROL_AE_MODE_ON)
    b.set(CaptureRequest.CONTROL_AWB_MODE, CameraMetadata.CONTROL_AWB_MODE_AUTO)
    afContinuous(b)
  }

  // https://developer.android.com/reference/android/hardware/camera2/CaptureRequest#SENSOR_EXPOSURE_TIME
  private fun manual(b: CaptureRequest.Builder, iso: Int, expNs: Long) {
    b.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO)
    b.set(CaptureRequest.CONTROL_AE_MODE, CameraMetadata.CONTROL_AE_MODE_OFF)
    b.set(CaptureRequest.SENSOR_SENSITIVITY, iso)
    b.set(CaptureRequest.SENSOR_EXPOSURE_TIME, expNs)
    b.set(CaptureRequest.SENSOR_FRAME_DURATION, max(expNs, 33_333_333L))
    afContinuous(b)
  }

  @SuppressLint("MissingPermission")
  private fun open(id: String): String {
    val latch = CountDownLatch(1)
    val err = AtomicReference<String?>(null)
    // https://developer.android.com/reference/android/hardware/camera2/CameraManager#openCamera(java.lang.String,%20android.hardware.camera2.CameraDevice.StateCallback,%20android.os.Handler)
    cm.openCamera(id, object : CameraDevice.StateCallback() {
      override fun onOpened(d: CameraDevice) {
        device = d
        latch.countDown()
      }
      override fun onDisconnected(d: CameraDevice) {
        err.compareAndSet(null, "kamera bağlantısı koptu")
        d.close()
        latch.countDown()
      }
      override fun onError(d: CameraDevice, error: Int) {
        err.compareAndSet(null, "openCamera hata kodu $error")
        d.close()
        latch.countDown()
      }
    }, handler)
    await(latch, 6000, "openCamera")
    err.get()?.let { throw IllegalStateException(it) }

    val map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP) ?: throw IllegalStateException("akış yapılandırması yok")
    val yuvSize = map.getOutputSizes(ImageFormat.YUV_420_888)?.filter { it.width <= 1280 && it.height <= 960 }?.maxByOrNull { it.width * it.height } ?: Size(640, 480)
    val jpegSize = map.getOutputSizes(ImageFormat.JPEG)?.maxByOrNull { it.width.toLong() * it.height } ?: throw IllegalStateException("JPEG boyutu yok")
    // https://developer.android.com/reference/android/media/ImageReader#newInstance(int,%20int,%20int,%20int)
    preview = ImageReader.newInstance(yuvSize.width, yuvSize.height, ImageFormat.YUV_420_888, 3).also { r ->
      r.setOnImageAvailableListener({ safe { it.acquireLatestImage() }?.close() }, handler)
    }
    jpeg = ImageReader.newInstance(jpegSize.width, jpegSize.height, ImageFormat.JPEG, 3)
    val rawSize = if ("RAW" in caps) map.getOutputSizes(ImageFormat.RAW_SENSOR)?.maxByOrNull { it.width.toLong() * it.height } else null
    if (rawSize != null) raw = ImageReader.newInstance(rawSize.width, rawSize.height, ImageFormat.RAW_SENSOR, 1)
    var note = ""
    session = try {
      createSession(listOfNotNull(preview!!.surface, jpeg!!.surface, raw?.surface))
    } catch (e: Exception) {
      if (raw == null) throw e
      safe { raw?.close() }
      raw = null
      note = "; önizleme+JPEG+RAW oturumu kurulamadı (${e.message}), RAW'sız açıldı"
      createSession(listOf(preview!!.surface, jpeg!!.surface))
    }
    startPreview { autoAe(it) }
    return "önizleme YUV ${yuvSize}, JPEG ${jpegSize}${rawSize?.let { ", RAW $it" } ?: ""}$note"
  }

  @Suppress("DEPRECATION")
  private fun createSession(surfaces: List<Surface>): CameraCaptureSession {
    val latch = CountDownLatch(1)
    val ref = AtomicReference<CameraCaptureSession?>(null)
    // https://developer.android.com/reference/android/hardware/camera2/CameraDevice#createCaptureSession(java.util.List%3Candroid.view.Surface%3E,%20android.hardware.camera2.CameraCaptureSession.StateCallback,%20android.os.Handler)
    device!!.createCaptureSession(surfaces, object : CameraCaptureSession.StateCallback() {
      override fun onConfigured(s: CameraCaptureSession) {
        ref.set(s)
        latch.countDown()
      }
      override fun onConfigureFailed(s: CameraCaptureSession) {
        latch.countDown()
      }
    }, handler)
    await(latch, 6000, "createCaptureSession")
    return ref.get() ?: throw IllegalStateException("oturum yapılandırılamadı")
  }

  private fun startPreview(configure: (CaptureRequest.Builder) -> Unit) {
    val b = device!!.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
    b.addTarget(preview!!.surface)
    configure(b)
    lastPreview.set(null)
    // https://developer.android.com/reference/android/hardware/camera2/CameraCaptureSession#setRepeatingRequest(android.hardware.camera2.CaptureRequest,%20android.hardware.camera2.CameraCaptureSession.CaptureCallback,%20android.os.Handler)
    session!!.setRepeatingRequest(b.build(), object : CameraCaptureSession.CaptureCallback() {
      override fun onCaptureCompleted(s: CameraCaptureSession, r: CaptureRequest, result: TotalCaptureResult) {
        lastPreview.set(result)
      }
    }, handler)
  }

  /** Önizleme isteğini değiştirir, AE yakınsayana (ya da 2,5 sn) kadar bekler. Dönen: bekleme ms. */
  private fun settle(configure: (CaptureRequest.Builder) -> Unit, check: (TotalCaptureResult) -> Boolean = { true }): Long {
    val t0 = now()
    startPreview(configure)
    Thread.sleep(400)
    // https://developer.android.com/reference/android/hardware/camera2/CaptureResult#CONTROL_AE_STATE
    val done = setOf(
      CaptureResult.CONTROL_AE_STATE_CONVERGED,
      CaptureResult.CONTROL_AE_STATE_LOCKED,
      CaptureResult.CONTROL_AE_STATE_FLASH_REQUIRED,
    )
    while (now() - t0 < 2500) {
      val r = lastPreview.get()
      if (r != null && check(r)) {
        val ae = r.get(CaptureResult.CONTROL_AE_STATE)
        val aeOff = r.get(CaptureResult.CONTROL_AE_MODE) == CameraMetadata.CONTROL_AE_MODE_OFF
        if (ae == null || aeOff || ae in done) break
      }
      Thread.sleep(40)
    }
    return now() - t0
  }

  private fun still(
    reader: ImageReader,
    configure: (CaptureRequest.Builder) -> Unit,
    consume: ((Image, TotalCaptureResult) -> Map<String, Any?>)? = null,
  ): Shot {
    drain(reader)
    val imgLatch = CountDownLatch(1)
    val resLatch = CountDownLatch(1)
    val img = AtomicReference<Image?>(null)
    val res = AtomicReference<TotalCaptureResult?>(null)
    val fail = AtomicReference<String?>(null)
    reader.setOnImageAvailableListener({ r ->
      val i = safe { r.acquireNextImage() }
      if (i != null && !img.compareAndSet(null, i)) i.close()
      imgLatch.countDown()
    }, handler)
    try {
      val b = device!!.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE)
      b.addTarget(reader.surface)
      configure(b)
      val t0 = now()
      // https://developer.android.com/reference/android/hardware/camera2/CameraCaptureSession#capture(android.hardware.camera2.CaptureRequest,%20android.hardware.camera2.CameraCaptureSession.CaptureCallback,%20android.os.Handler)
      session!!.capture(b.build(), object : CameraCaptureSession.CaptureCallback() {
        override fun onCaptureCompleted(s: CameraCaptureSession, r: CaptureRequest, result: TotalCaptureResult) {
          res.set(result)
          resLatch.countDown()
        }
        override fun onCaptureFailed(s: CameraCaptureSession, r: CaptureRequest, failure: CaptureFailure) {
          fail.set("capture başarısız (neden ${failure.reason})")
          resLatch.countDown()
          imgLatch.countDown()
        }
      }, handler)
      await(resLatch, 10000, "capture sonucu")
      fail.get()?.let { throw IllegalStateException(it) }
      await(imgLatch, 10000, "görüntü")
      val ms = now() - t0
      val image = img.get() ?: throw IllegalStateException("görüntü gelmedi")
      val result = res.get() ?: throw IllegalStateException("capture sonucu yok")
      try {
        val plane = image.planes[0].buffer
        val size = plane.remaining()
        var stats: Stats? = null
        var extra: Map<String, Any?> = emptyMap()
        if (image.format == ImageFormat.JPEG) {
          val bytes = ByteArray(size)
          plane.get(bytes)
          stats = jpegStats(bytes)
        } else {
          extra = consume?.invoke(image, result) ?: emptyMap()
        }
        return Shot(
          ms, image.width, image.height, size, stats,
          result.get(CaptureResult.SENSOR_SENSITIVITY),
          result.get(CaptureResult.SENSOR_EXPOSURE_TIME),
          result.get(CaptureResult.LENS_FOCUS_DISTANCE),
          extra,
        )
      } finally {
        image.close()
      }
    } finally {
      reader.setOnImageAvailableListener(null, null)
    }
  }

  private fun close() {
    safe { session?.stopRepeating() }
    safe { session?.close() }
    safe { device?.close() }
    safe { preview?.close() }
    safe { jpeg?.close() }
    safe { raw?.close() }
    thread.quitSafely()
  }
}
