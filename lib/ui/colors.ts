/**
 * Dışa aktarılan görüntünün içindeki sabit renkler (canvas). Arayüz paleti DEĞİLDİR:
 * arayüz renkleri yalnız app/globals.css'teki belirteçlerdir (tek kaynak, Faz C).
 * Canvas CSS değişkeni okuyamayan yerlerde (node testleri, export) bu dosya tek sabit kaynağıdır.
 * tests/color-tokens.test.ts, paletle ortak değerlerin (siyah, yüzey 1) aynı kaldığını denetler.
 */
export const EXPORT_COLORS = {
  /** Legacy: behind the photo in Carousel "fit" mode (unused since Faz R) */
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
  /** Legacy: Story background options (unused since Faz R) */
  storyWhite: '#ffffff',
  storyCharcoal: '#1c1c1e',
  storyBlack: '#000000',
} as const;

export const FRAME_MATTE_PRESETS = {
  white: '#ffffff',
  cream: '#f5efe6',
  charcoal: '#222224',
  black: '#000000',
  warmGray: '#8e8e93',
} as const;

export const FRAME_GRADIENTS = {
  sunset: ['#ff8a65', '#ff7043', '#7e57c2'] as const,
  deep: ['#1e293b', '#0f172a'] as const,
  subtle: ['#e2e8f0', '#cbd5e1'] as const,
} as const;

/**
 * Analog tarih damgasının yazı tipi: fotoğrafın (export içeriğinin) parçası, arayüz metni değil.
 * Arayüzde monospace yasak (tests/ui-rules.test.ts); bu dosya tek istisna yeridir.
 */
export const STAMP_FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/** Tarayıcı çubuğu rengi (viewport.themeColor); zemin belirteciyle aynı */
export const THEME_COLOR = '#000000';
