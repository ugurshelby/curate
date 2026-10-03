/**
 * Curate Core — Reference images (owner decision K3, 2026-10-02)
 * The 13 tracked files in public/reference-images/ enter the library only on an explicit user action.
 * Loaded from the same origin; nothing is sent anywhere.
 */

export const REFERENCE_BASE_PATH = '/reference-images/';

export const REFERENCE_IMAGES: { file: string; label: string }[] = [
  { file: 'cim-saha.jfif', label: 'Çim saha' },
  { file: 'delivery.jfif', label: 'Delivery' },
  { file: 'gol-evi.jfif', label: 'Göl evi' },
  { file: 'gun-batimi-gunese-dokunan-eleman.jfif', label: 'Gün batımı eleman' },
  { file: 'gun-batimi-kosu.jfif', label: 'Gün batımı koşu' },
  { file: 'ic-mekan-bar.jfif', label: 'İç mekan bar' },
  { file: 'kopru.jfif', label: 'Köprü' },
  { file: 'kovboy.jfif', label: 'Kovboy' },
  { file: 'mavi-sisli-sehir.jfif', label: 'Mavi sisli şehir' },
  { file: 'sehir-gokdelen.jfif', label: 'Şehir gökdelen' },
  { file: 'sehir-isiklari-otoyol.jfif', label: 'Şehir ışıkları' },
  { file: 'tabela.jfif', label: 'Tabela' },
  { file: 'tren.jfif', label: 'Tren' },
];

export function referenceImageUrl(file: string): string {
  return `${REFERENCE_BASE_PATH}${file}`;
}

/**
 * Fetches the selected reference files from the same origin and returns them as JPEG Files.
 * `.jfif` is served with an ambiguous type, so the Blob type is set explicitly to image/jpeg.
 */
export async function fetchReferenceFiles(
  files: string[],
  fetchFn: (input: string) => Promise<Response> = (input) => fetch(input)
): Promise<File[]> {
  return Promise.all(
    files.map(async (file) => {
      const res = await fetchFn(referenceImageUrl(file));
      if (!res.ok) {
        throw new Error(`Referans görsel yüklenemedi: ${file}`);
      }
      const data = await res.arrayBuffer();
      const name = file.replace(/\.jfif$/i, '.jpg');
      return new File([data], name, { type: 'image/jpeg' });
    })
  );
}
