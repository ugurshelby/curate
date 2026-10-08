// Raporu cihazdan çıkarma: belge klasörüne yaz + Android paylaşım sayfası, SAF ile klasöre kaydet, panoya kopyala. Ağ yok.
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Uygulamanın belge klasörüne yazar (her seferinde üzerine) */
export function writeToDocuments(name: string, text: string): File {
  const f = new File(Paths.document, name);
  if (f.exists) f.delete();
  f.create();
  f.write(text);
  return f;
}

export async function shareReport(name: string, text: string): Promise<string> {
  const f = writeToDocuments(name, text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Paylaşım bu cihazda yok');
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: name });
  return f.uri;
}

/** Storage Access Framework klasör seçici: kullanıcı "Downloads" (İndirilenler) klasörünü seçer */
export async function saveToPickedFolder(name: string, text: string): Promise<string> {
  const dir = await Directory.pickDirectoryAsync();
  const f = dir.createFile(name, 'application/json');
  f.write(text);
  return f.uri;
}

export async function copyReport(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
