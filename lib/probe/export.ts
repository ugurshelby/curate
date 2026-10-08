// Yoklama raporunu cihazdan dışarı çıkarma: indir, Web Share ile dosya paylaş, panoya kopyala. Ağ yok.

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
 * Dosya olarak paylaşır. Chrome Android'in paylaşım tip listesi JSON'u kabul etmeyebilir;
 * sırayla application/json, text/plain (.json) ve .txt denenir. Dönen değer kullanılan biçimdir.
 */
export async function shareJson(name: string, text: string): Promise<string> {
  if (!navigator.share) throw new Error('Bu tarayıcıda paylaşım yok');
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
  throw new Error('Tarayıcı dosya paylaşımını kabul etmedi; İndir ya da Kopyala kullan');
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // izin yoksa eski yol
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
  if (!ok) throw new Error('Panoya kopyalanamadı');
}
