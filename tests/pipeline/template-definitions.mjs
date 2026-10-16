/**
 * Curate Studio — 5 Temel Hazır Onarım Şablonu (Preset Templates)
 * 
 * Kullanıcının test görselleri ve şikayetleri doğrultusunda kalibre edilmiş,
 * görsel yorumlayıcı model ve uygulayıcı modelin ortak çalışacağı temel şablonlar.
 */

export const REPAIR_TEMPLATES = {
  template_blown_light: {
    id: 'template_blown_light',
    name: 'Patlak Işığı Topla',
    category: 'blown_highlights',
    icon: 'SunDim',
    userExpectation: 'Pencereden dışarısı veya parlak gökyüzü bembeyaz patlamış; aşırı ışığı geri çek, pencere detaylarını ve dengeli ışığı kurtar.',
    technicalGoals: {
      targetHighlightReduction: 0.35,
      targetExposureAdjustment: -0.18,
      shadowPreservation: true,
      maxContrastBoost: 0.10,
    },
    defaultDirective: 'Aşırı parlaklığı toparla, pencere ve dış ortam detaylarını kurtar, genel sahne ışığını dengele.',
  },

  template_illuminate_subject: {
    id: 'template_illuminate_subject',
    name: 'Özneyi Aydınlat',
    category: 'underexposed_subject',
    icon: 'UserCheck',
    userExpectation: 'Özne veya yüz ters ışıkta ve gölgede kalmış; arka planı patlatmadan ana özneyi aydınlat ve öne çıkar.',
    technicalGoals: {
      targetSubjectLift: 0.32,
      backgroundSafetyCap: -0.05,
      skinTonePreservation: true,
      targetShadowLift: 0.28,
    },
    defaultDirective: 'Özne ve yüzü öne çıkaracak şekilde aydınlat, arka plan parlaklığını koruyarak sahne dengesini kur.',
  },

  template_dehaze_vibrance: {
    id: 'template_dehaze_vibrance',
    name: 'Pus Gider & Canlandır',
    category: 'desaturated_flat',
    icon: 'Sparkles',
    userExpectation: 'Renkler çok soluk ve cansız, sisli veya donuk bir atmosfer var; pusu gider, canlı ve dinamik renkler kazandır.',
    technicalGoals: {
      targetVibranceBoost: 0.25,
      targetContrastBoost: 0.18,
      blackPointOptimization: true,
      naturalSkinCheck: true,
    },
    defaultDirective: 'Soluk ve donuk renkleri canlandır, pusu gider, dinamik kontrast ile sahneye derinlik kat.',
  },

  template_neutralize_cast: {
    id: 'template_neutralize_cast',
    name: 'Renk Kaymasını Nötrle',
    category: 'color_cast_vignette',
    icon: 'Compass',
    userExpectation: 'Görselde rahatsız edici sarı/yeşil/mavi renk tonu sapması veya kenar kararması var; doğal beyaz dengesine getir.',
    technicalGoals: {
      whiteBalanceNeutralization: true,
      edgeFalloffCorrection: 0.20,
      targetTintCorrection: true,
    },
    defaultDirective: 'Yapay renk sapmasını nötrle, beyaz dengesini sağla ve kenarlardaki lens kararmasını düzelt.',
  },

  template_night_clarity: {
    id: 'template_night_clarity',
    name: 'Gece & Gölge Detay',
    category: 'noisy_blurry',
    icon: 'Moon',
    userExpectation: 'Gece veya düşük ışıkta gölgeler ezilmiş, karanlıkta kalan dokular kaybolmuş; dokuları ve gölge detayını aç.',
    technicalGoals: {
      shadowDetailRecovery: 0.30,
      highlightHaloControl: true,
      perceptualClarityBoost: 0.14,
    },
    defaultDirective: 'Karanlıkta kalan gölge detaylarını aç, sokak ve neon ışıklarının patlamasını engelle.',
  },
};

/**
 * Birincil kusur kategorisine en uygun hazır şablonu eşleştirir
 */
export function matchTemplateForDefect(defectCategory) {
  switch (defectCategory) {
    case 'blown_highlights':
      return REPAIR_TEMPLATES.template_blown_light;
    case 'underexposed_subject':
      return REPAIR_TEMPLATES.template_illuminate_subject;
    case 'desaturated_flat':
      return REPAIR_TEMPLATES.template_dehaze_vibrance;
    case 'color_cast_vignette':
      return REPAIR_TEMPLATES.template_neutralize_cast;
    case 'noisy_blurry':
    default:
      return REPAIR_TEMPLATES.template_night_clarity;
  }
}
