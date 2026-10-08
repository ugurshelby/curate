/**
 * All user-facing UI copy (Turkish). Single source (CDS v3 §7, AGENTS.md §5).
 * Rules: short, result- and action-oriented, no engine jargon outside `gelismis` blocks
 * (tests/ui-rules.test.ts enforces the jargon list).
 */

import type { FrameSizeId } from '../core/types';

export type ModuleId = 'carousel' | 'story' | 'frame' | 'upscale' | 'edit';

export const tr = {
  app: {
    name: 'Curate',
    tagline: 'Fotoğraflarını tek dokunuşla düzenle.',
    description: 'Fotoğraflarını tek dokunuşla düzenle, Instagram ve TikTok için hazırla.',
  },

  common: {
    back: 'Ana sayfaya dön',
    close: 'Kapat',
    export: 'Dışa aktar',
    reset: 'Sıfırla',
    resetToDefault: 'Varsayılana sıfırla',
    cancel: 'Vazgeç',
    preparing: 'Hazırlanıyor…',
    add: 'Ekle',
    uploadPhoto: 'Fotoğraf ekle',
    loadReference: 'Referans görsel yükle',
    clearSeries: 'Seriyi temizle',
    original: 'Orijinal',
    advanced: 'Gelişmiş',
    tools: 'Araçlar',
    natural: 'Doğal',
    amount: 'Miktar',
    done: 'Tamam',
    imageLoadFailed: 'Görsel yüklenemedi',
    clearAllConfirm: 'Tüm fotoğraflar kaldırılsın mı?',
    dragPinchHint: 'Sürükle, iki parmakla yakınlaştır',
    holdForOriginal: 'Basılı tut: orijinal',
    tooLarge: 'Bu boyut için çok büyük',
  },

  hub: {
    title: 'Ne hazırlıyoruz?',
    subtitle: 'Fotoğraf ekle, bir modül seç, tek dokunuşla hazırla.',
    dropTitle: 'Fotoğraf ekle',
    dropHint: 'Dokun ya da sürükleyip bırak',
    dropActive: 'Bırak, ekleyelim',
    libraryCount: (n: number) => `${n} fotoğraf hazır`,
    modulesHeading: 'Modüller',
    clearAll: 'Tümünü kaldır',
    clearConfirm: 'Kütüphanedeki tüm fotoğraflar kaldırılsın mı?',
    trustBadge: 'Yerel ve gizli işleme',
    rememberTitle: 'Fotoğrafları bu cihazda hatırla',
    rememberStatus: {
      kept: (n: number, size: string) => (n > 0 ? `${n} fotoğraf bu cihazda (${size})` : 'Eklediğin fotoğraflar bu cihazda kalır'),
      partial: (n: number, size: string, skipped: number) => `${n} fotoğraf bu cihazda (${size}); ${skipped} tanesi sığmadı`,
      full: (n: number) => `Cihazda yer doldu; ${n} fotoğraf saklandı`,
      off: 'Kapalı: sayfa yenilenince fotoğraflar gider',
      unavailable: 'Bu tarayıcıda saklanamıyor (gizli sekme olabilir)',
    },
    trustDetail:
      "Fotoğrafların bu cihazda işlenir ve hiçbir yere yüklenmez. Tek istisna: Düzenle'de \"AI ile onar\"a dokunduğunda o fotoğraf işlenmek için Google'a gönderilir ve saklanmaz.",
  },

  modules: {
    carousel: { title: 'Carousel', subtitle: 'Sıralı seri, tek tıkla aynı renk', tags: ['Instagram', 'TikTok'] },
    story: { title: 'Story', subtitle: 'Fotoğraflar kendiliğinden yerleşir', tags: ['2–6 fotoğraf'] },
    edit: { title: 'Düzenle', subtitle: 'Onar, kırp, preset uygula', tags: ['Tek fotoğraf', 'AI'] },
    frame: { title: 'Çerçeve', subtitle: 'Polaroid, mat ya da renkli zemin', tags: ['Tek fotoğraf'] },
    upscale: { title: 'Büyüt', subtitle: 'Baskı ve paylaşım için 2× ya da 4×', tags: ['Tek fotoğraf'] },
  } as Record<ModuleId, { title: string; subtitle: string; tags: string[] }>,

  addMenu: {
    open: 'Ekle',
  },

  export: {
    title: 'Dışa aktar',
    target: 'Hedef',
    count: 'Görsel',
    file: 'Dosya',
    quality: 'Kalite',
    format: 'Biçim',
    png: 'PNG (kayıpsız)',
    jpeg: (q: number) => `JPEG %${Math.round(q * 100)}`,
    privacy: 'Konum ve cihaz bilgisi dosyadan silinir.',
    download: 'İndir',
    downloadZip: (n: number) => `İndir (${n} görsel, zip)`,
    preparingN: (i: number, n: number) => `Hazırlanıyor ${i}/${n}`,
    zipping: 'Zip hazırlanıyor',
    failed: 'Dışa aktarma başarısız oldu.',
    done: (name: string, size: string) => `İndirildi: ${name} · ${size}`,
    reduced: (q: number) => `8 MB sınırı için JPEG kalitesi %${Math.round(q * 100)}'e düşürüldü.`,
    overLimit: "Dosya en düşük basamakta bile 8 MB'ı aşıyor.",
  },

  reference: {
    title: 'Referans görsel seç',
    loadFailed: 'Referans görseller yüklenemedi.',
    noRoom: 'Bu modülde yer kalmadı.',
    pickOne: 'Bir görsel seç.',
    pickMax: (n: number) => `En çok ${n} görsel seçebilirsin.`,
    all: 'Hepsi',
    firstN: (n: number) => `İlk ${n}`,
    loading: 'Yükleniyor',
    addN: (n: number) => `Ekle (${n})`,
  },

  ai: {
    title: 'AI ile onar',
    checking: 'Kontrol ediliyor…',
    pinLabel: 'AI PIN\'i (4 hane) — bu cihaz hatırlanır',
    pinSubmit: 'Devam',
    orderHint: 'En iyi sıra: önce AI ile onar, sonra kırp ve preset uygula.',
    aspectWarn: 'Bu fotoğrafın oranı desteklenen oranlardan farklı; model kareyi kırpabilir veya uzatabilir.',
    forgetDevice: 'Bu cihazı unut',
    cancel: 'İptal',
    privacy: "Bu işlem için fotoğraf Google'a gönderilir.",
    canceled: 'İptal edildi.',
    resultUnreadable: 'Sonuç açılamadı.',
    prepareFailed: 'Fotoğraf hazırlanamadı.',
  },

  review: {
    aria: 'AI sonucunu kontrol et',
    title: 'Sonucu kontrol et',
    warning: 'AI bazen fotoğrafta olmayan bir şey ekleyebilir. Kaydetmeden önce kontrol et.',
    lookHere: 'Buraya dikkatli bak',
    holdHint: 'Basılı tut: orijinal',
    discard: 'At',
    use: 'Kullan',
  },

  carousel: {
    syncToFrame: 'Seriyi bu kareye uydur',
    syncOn: 'Seri bu kareye uyumlu',
    makeCover: 'Kapak yap',
    removeFromSeries: 'Seriden çıkar',
    emptySeries: 'Seride henüz fotoğraf yok',
    clearConfirm: 'Serideki tüm fotoğraflar kaldırılsın mı?',
    target: 'Hedef platform',
    overlayHide: 'Platform görünümünü gizle',
    overlayShow: 'Platform görünümünü göster',
    fitToggle: 'Doldur veya sığdır',
    fill: 'Doldur',
    fit: 'Sığdır',
    editToggle: 'Düzenle',
  },

  edit: {
    tabPreset: 'Preset',
    tabCrop: 'Kırp',
    tabFix: 'Düzeltme',
    tabsAria: 'Düzenle sekmeleri',
    empty: 'Düzenlemek için bir fotoğraf ekle',
    cropCorner: 'Kırp köşesi',
    backToSource: 'Kaynağa dön',
    flip: 'Çevir',
    straighten: 'Düzelt (ufuk)',
    enlarge: 'Büyüt',
    tooLargeToEnlarge: 'Büyütmek için çok büyük',
  },

  presets: {
    auto: 'Otomatik',
    autoHint: 'Sahneye bakar, en uygun preset ve miktarı seçer',
    original: 'Orijinal',
    autoApplied: (name: string, pct: number) => `Otomatik: ${name} %${pct}`,
    families: { temel: 'Temel', portre: 'Portre', isik: 'Işık', imza: 'İmza' },
    items: {
      dogal: { name: 'Doğal', hint: 'Hafif kontrast ve canlılık; her kareye uyar' },
      canli: { name: 'Canlı', hint: 'Soluk kareleri renklendirir' },
      yumusak: { name: 'Yumuşak', hint: 'Düşük kontrast, açık gölgeler' },
      siyah_beyaz: { name: 'Siyah Beyaz', hint: 'Temiz, dengeli siyah-beyaz' },
      portre: { name: 'Portre', hint: 'Cildi doğal ve sıcak tutar' },
      on_kamera: { name: 'Ön Kamera', hint: 'Ön kameranın sert görünümünü yumuşatır' },
      altin_saat: { name: 'Altın Saat', hint: 'Gün batımının sıcak ışığını öne çıkarır' },
      mavi_saat: { name: 'Mavi Saat', hint: 'Alacakaranlığın serin mavisi' },
      sert_gunes: { name: 'Sert Güneş', hint: 'Öğle güneşinde gölgeyi açar, parlağı toplar' },
      gece: { name: 'Gece', hint: 'Derin siyah, kontrollü ışıklar' },
      moody_teal: { name: 'Moody Teal', hint: 'Mimari ve gökyüzü; serin gölge, sıcak ışık' },
      warm_silhouette: { name: 'Warm Silhouette', hint: 'Ters ışıkta sıcak, keskin siluet' },
      night_cinematic: { name: 'Night Cinematic', hint: 'Gece ve neon; ışıklarda hafif hale' },
      muted_coastal: { name: 'Muted Coastal', hint: 'Pastel, sakin, ferah' },
      amber_grain: { name: 'Amber Grain', hint: 'Sıcak amber ve film greni' },
      monochrome_noir: { name: 'Monochrome Noir', hint: 'Yüksek kontrastlı siyah-beyaz' },
    } as Record<string, { name: string; hint: string }>,
  },

  fix: {
    auto: 'Otomatik',
    autoNone: 'Belirgin bir sorun bulunmadı; düzeltme gerekmiyor.',
    note: 'Yalnız iyileştirir, olmayan ayrıntıyı üretmez. Çok karanlık karelerde sınırlıdır.',
    holdHint: 'Basılı tut: düzeltmesiz',
    before: 'Düzeltmesiz',
    strength: 'Şiddet',
    rows: {
      noise: { title: 'Noise Azalt', hint: 'Gren ve renk lekelerini temizler' },
      edgeSharp: { title: 'Kenar Netliği', hint: 'Kenarlarda kaybolan netliği toplar' },
      edgeColor: { title: 'Kenar Renk Düzelt', hint: 'Köşelerdeki kararmayı ve renk kaymasını giderir' },
      shadows: { title: 'Gölge Aç', hint: 'Karanlıkta kalan ayrıntıyı açar' },
      highlights: { title: 'Parlak Alan Kurtar', hint: 'Fazla parlak yerlerde ayrıntıyı geri getirir' },
      dehaze: { title: 'Pus Gider', hint: 'Sisli, soluk görünümü netleştirir' },
    },
  },

  frame: {
    empty: 'Çerçeve için henüz fotoğraf yok',
    width: 'Genişlik',
    corner: 'Köşe',
    type: 'Çerçeve tipi',
    stamp: 'Tarih damgası',
    types: { polaroid: 'Polaroid', matte: 'Mat', gradient: 'Gradyan' },
    size: 'Boyut',
    resolution: 'Çözünürlük',
    resolutions: { standard: 'Standart', high: '4K' },
    sizeNames: {
      '4_5': 'Dikey gönderi',
      '1_1': 'Kare',
      '9_16': 'Story ve video',
      '3_4': 'Dikey 3:4',
      '2_3': 'Dikey baskı',
      '5_4': 'Yatay 5:4',
      '4_3': 'Yatay 4:3',
      '3_2': 'Yatay baskı',
      '16_9': 'Yatay video',
      '191_1': 'Geniş yatay',
    } as Record<FrameSizeId, string>,
  },

  story: {
    rejected: (max: number, n: number) => `Story en fazla ${max} fotoğraf alır; ${n} fotoğraf alınmadı.`,
    empty: 'Story için en az 2 fotoğraf ekle',
    cellAria: (n: number, selected: boolean) => `${n}. hücre${selected ? ', seçili' : ''}`,
    addOneMore: 'Bir fotoğraf daha ekle',
    usesFirst: (n: number, max: number) => `Kütüphanede ${n} fotoğraf var; Story ilk ${max} tanesini kullanır.`,
    minPhotos: 'En az 2 fotoğraf ekle',
    replace: 'Değiştir',
    background: 'Zemin',
    gradient: 'Gradyan',
    bg: { black: 'OLED siyah', white: 'Beyaz', charcoal: 'Kömür', 'adaptive-gradient': 'Gradyan' },
    spacing: 'Boşluk',
    max: (max: number) => `Story en fazla ${max} fotoğraf alır.`,
  },

  upscale: {
    empty: 'Büyütülecek fotoğraf henüz seçilmedi',
    divider: 'Öncesi / sonrası ayırıcı',
    factorLabel: 'Büyütme',
    factorAria: 'Büyütme oranı',
    output: (w: number, h: number) => `Çıktı ${w} × ${h}`,
    limit: (some: boolean, edge: number, mp: number) =>
      `${some ? '4×: ' : ''}Bu boyut için çok büyük (en çok ${edge} px kenar, ${mp} MP)`,
    previewNote: (factor: number) => `Önizleme (${factor}×)`,
    originalNote: 'Orijinal',
  },

  /** Advanced / info texts: may name the technique (CDS §7) */
  gelismis: {
    upscaleEngine: 'Büyütme yöntemi: Lanczos-3 (yerel, cihazda). Önizleme yalnız benzetimdir; asıl büyütme dışa aktarırken yapılır.',
    metadata: 'Dosyadaki EXIF ve GPS bilgileri silinir.',
  },
} as const;
