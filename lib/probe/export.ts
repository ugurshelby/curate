// Gets the probe report off the device: download, Web Share as a file, clipboard. No network.
import { trProbe } from '../i18n/tr';

export function downloadJson(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Shares as a file. Chrome Android's share type allow-list may reject JSON, so
 * application/json, text/plain (.json) and .txt are tried in order. Returns the form used.
 */
export async function shareJson(name: string, text: string): Promise<string> {
  if (!navigator.share) throw new Error(trProbe.noShare);
  const candidates = [
    new File([text], name, { type: 'application/json' }),
    new File([text], name, { type: 'text/plain' }),
    new File([text], name.replace(/\.json$/, '.txt'), { type: 'text/plain' }),
  ];
  for (const f of candidates) {
    let ok = false;
    try {
      ok = !!navigator.canShare?.({ files: [f] });
    } catch {
      ok = false;
    }
    if (!ok) continue;
    await navigator.share({ files: [f], title: name });
    return `${f.name} (${f.type})`;
  }
  throw new Error(trProbe.shareRejected);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // no permission: legacy path
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error(trProbe.copyFailed);
}
