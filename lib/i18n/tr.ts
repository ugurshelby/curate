/**
 * All user-facing UI copy (Turkish). Single source (CDS v3 §7, AGENTS.md §5).
 * Rules: short, result- and action-oriented, no engine jargon outside `gelismis` blocks
 * (tests/ui-rules.test.ts enforces the jargon list).
 */

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

  frame: {
    empty: 'Çerçeve için henüz fotoğraf yok',
    width: 'Genişlik',
    corner: 'Köşe',
    type: 'Çerçeve tipi',
    stamp: 'Tarih damgası',
    types: { polaroid: 'Polaroid', matte: 'Mat', gradient: 'Gradyan' },
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
    lutUpload: '3D LUT (.cube) yükle',
    lutLoaded: (title: string) => `LUT: ${title}`,
    lutRemove: "Yüklü LUT'u kaldır",
    lutInvalid: 'Geçersiz .cube dosyası: standart bir 3D LUT dosyası seç.',
    metadata: 'Dosyadaki EXIF ve GPS bilgileri silinir.',
  },
} as const;
