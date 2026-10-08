/**
 * Dışa aktarılan görüntünün içindeki sabit renkler (canvas). Arayüz paleti DEĞİLDİR:
 * arayüz renkleri yalnız app/globals.css'teki belirteçlerdir (tek kaynak, Faz C).
 * Canvas CSS değişkeni okuyamayan yerlerde (node testleri, export) bu dosya tek sabit kaynağıdır.
 * tests/color-tokens.test.ts, paletle ortak değerlerin (siyah, yüzey 1) aynı kaldığını denetler.
 */
export const EXPORT_COLORS = {
  /** Carousel "sığdır" modunda fotoğrafın arkası */
  fitBackground: '#0a0a0c',
  /** Düzenle kırpmasında görüntü dışı kalan alan */
  editMatte: '#000000',
  /** Çerçeve zeminleri */
  framePolaroid: '#fbfbfa',
  frameMatte: '#111214',
  /** Matte çerçevenin ince iç çizgisi ve damga gölgesi (önizleme ve export aynı değeri kullanır) */
  frameMatteBorder: 'rgba(255, 255, 255, 0.1)',
  stampShadow: 'rgba(0, 0, 0, 0.35)',
  /** Analog tarih damgası turuncusu: açık ve koyu çerçeve üzerinde okunur iki ton */
  stampOnLight: '#d96b27',
  stampOnDark: '#e8772e',
  /** Story zemin seçenekleri ve akıllı gradyan yedeği */
  storyWhite: '#ffffff',
  storyCharcoal: '#1c1c1e',
  storyBlack: '#000000',
} as const;

/**
 * Analog tarih damgasının yazı tipi: fotoğrafın (export içeriğinin) parçası, arayüz metni değil.
 * Arayüzde monospace yasak (tests/ui-rules.test.ts); bu dosya tek istisna yeridir.
 */
export const STAMP_FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/** Tarayıcı çubuğu rengi (viewport.themeColor); zemin belirteciyle aynı */
export const THEME_COLOR = '#000000';
