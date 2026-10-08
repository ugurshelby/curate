// Whole-app PIN gate (D27) for local audit scripts. The local server runs with TEST values only:
//   VERTEX_API_KEY=<any test text> CURATE_AI_PASSWORD=<test 4 digits> npx next start -p 3101
//   AUDIT_PIN=<same test 4 digits> node scripts/audit-ui.mjs
// Never use the real PIN here (AGENTS.md §2.5).
export async function unlockGate(browserOrContext, base, pin = process.env.AUDIT_PIN) {
  if (!pin) throw new Error('AUDIT_PIN yok: yerel sunucuyu test PIN\'iyle başlat (docs/procedures.md §2)');
  const page = await browserOrContext.newPage();
  await page.goto(`${base}/kilit`, { waitUntil: 'networkidle0' });
  if (new URL(page.url()).pathname === '/kilit') {
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }), page.type('#lock-pin', pin)]);
    if (new URL(page.url()).pathname === '/kilit') throw new Error('Test PIN\'i kabul edilmedi');
  }
  await page.close();
}
