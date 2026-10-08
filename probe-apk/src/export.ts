// Gets the report off the device: write to documents + Android share sheet, save via SAF folder picker, clipboard. No network.
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes to the app's document directory (overwrites each time) */
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

/** Storage Access Framework folder picker: the user picks the Downloads folder */
export async function saveToPickedFolder(name: string, text: string): Promise<string> {
  const dir = await Directory.pickDirectoryAsync();
  const f = dir.createFile(name, 'application/json');
  f.write(text);
  return f.uri;
}

export async function copyReport(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
