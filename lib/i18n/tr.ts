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
    privacy: 'Konum ve cihaz bilgisi dosyadan silinir.',
    download: 'İndir',
    downloadZip: 'Zip olarak indir',
  },

  carousel: {
    syncToFrame: 'Seriyi bu kareye uydur',
    syncOn: 'Seri bu kareye uyumlu',
    makeCover: 'Kapak yap',
    removeFromSeries: 'Seriden çıkar',
    emptySeries: 'Seride henüz fotoğraf yok',
    clearConfirm: 'Serideki tüm fotoğraflar kaldırılsın mı?',
  },

  upscale: {
    previewNote: (factor: number) => `Önizleme (${factor}×)`,
    originalNote: 'Orijinal',
  },

  /** Advanced / info texts: may name the technique (CDS §7) */
  gelismis: {
    upscaleEngine: 'Büyütme yöntemi: Lanczos-3 (yerel, cihazda). Önizleme yalnız benzetimdir; asıl büyütme dışa aktarırken yapılır.',
    lutUpload: '3D LUT (.cube) yükle',
    lutLoaded: (title: string) => `LUT: ${title}`,
    metadata: 'Dosyadaki EXIF ve GPS bilgileri silinir.',
  },
} as const;
