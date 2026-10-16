/**
 * Kullanıcı Girdisi Simülatörü
 * Her kusur kategorisine karşılık gelen gerçekçi, doğal insan dili şikayetlerini üretir.
 */

export const COMPLAINT_LIBRARY = {
  blown_highlights: [
    'Bu görselde ışık çok patlamış, camdan dışarısı bembeyaz kalmış.',
    'Gökyüzü ve beyaz alanlar aşırı parlamış, detaylar tamamen kaybolmuş.',
    'Işıklar çok sert vurmuş, pencereler ve parlak kısımlar bembeyaz, detayları kurtarmak istiyorum.',
    'Güneş yüzünden patlayan bölgeler gözü tırmalıyor, tonların dengelenmesi lazım.',
  ],
  desaturated_flat: [
    'Renkler neredeyse yok, çok soluk ve cansız çıkmış.',
    'Fotoğraf çok mat ve solgun, canlı ve doğal renkler gerekiyor.',
    'Tonlar çok donuk, kontrastı ve renk derinliğini toparlamak lazım.',
    'Karedeki renkler ölü gibi duruyor, yapaylaşmadan doygunluk kazandırmalıyız.',
  ],
  noisy_blurry: [
    'Görsel çok grenli ve detaylar bulanık kalmış.',
    'Fotoğrafta çok fazla karıncalanma var ve yüzler net değil.',
    'Karanlık bölgelerdeki kumlanma çok rahatsız ediyor, dokuyu bozmadan temizlemek gerek.',
    'Işık az olduğu için kumlanma çok fazla ve keskinlik gitmiş.',
  ],
  underexposed_subject: [
    'Özne çok geri planda kalmış, öne çıkarılması gerekiyor.',
    'Arka plan aydınlık ama ana kişi çok karanlıkta kalmış.',
    'Ana nesne gölgede boğulmuş, yüz ve detaylar seçilmiyor.',
    'Karedeki odak noktası çok karanlıkta kalmış, aydınlatıp vurgulamak lazım.',
  ],
  color_cast_vignette: [
    'Görselin kenarları kararmış ve genelinde tuhaf bir sarı/yeşil renk tonu var.',
    'Köşelerdeki lens kararmasını gidermek ve renk dengesini nötrlemek istiyorum.',
    'Fotoğrafta belirgin bir renk kayması var, doğal tonlara geri çekilmeli.',
    'Kenarlar çok koyu kalmış ve renkler bir garip duruyor.',
  ],
};

/**
 * Belirli bir kusur kategorisi ve dosya adı için deterministik ama çeşitli bir şikayet seçer
 */
export function assignUserComplaint(defectCategory, filename = '') {
  const list = COMPLAINT_LIBRARY[defectCategory] || COMPLAINT_LIBRARY.desaturated_flat;
  // Hash benzeri deterministik seçim
  let hash = 0;
  for (let i = 0; i < filename.length; i++) {
    hash = (hash << 5) - hash + filename.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}
