import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { copyReport, saveToPickedFolder, shareReport } from './src/export';
import { MATRIX_KEYS, MATRIX_LABELS, probeFileName, validateProbeReport, type ProbeReport, type ProbeStatus } from './src/probe-schema';
import { NATIVE_STEPS, runNativeProbe } from './src/run-native';

// Curate palette (design/CURATE_DESIGN_SYSTEM.md §2); this package is outside the root colour checks
const C = {
  base: '#000000',
  surface: '#1C1C1E',
  surface2: '#2C2C2E',
  separator: '#38383A',
  ink1: '#FFFFFF',
  ink2: '#AEAEB2',
  ink3: '#8E8E93',
  accentFill: '#0071E3',
  danger: '#FF453A',
  success: '#30D158',
};

const STATUS_LABEL: Record<ProbeStatus, string> = {
  var: 'Var',
  yok: 'Yok',
  'kabul-edildi-etkisiz': 'Etkisiz',
  etkili: 'Etkili',
  hata: 'Hata',
  atlandı: 'Atlandı',
};
const STATUS_COLOR: Record<ProbeStatus, string> = {
  var: C.ink1,
  yok: C.ink3,
  'kabul-edildi-etkisiz': C.ink2,
  etkili: C.success,
  hata: C.danger,
  atlandı: C.ink3,
};

type Phase = 'hazır' | 'çalışıyor' | 'bitti';

export default function App() {
  const [phase, setPhase] = useState<Phase>('hazır');
  const [step, setStep] = useState(-1);
  const [report, setReport] = useState<ProbeReport | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showTests, setShowTests] = useState(false);

  const start = () => {
    setPhase('çalışıyor');
    setReport(null);
    setFatal(null);
    setMessage(null);
    setStep(0);
    runNativeProbe(setStep)
      .then(setReport)
      .catch((e: unknown) => setFatal(e instanceof Error ? e.message : String(e)))
      .finally(() => setPhase('bitti'));
  };

  const json = report ? JSON.stringify(report, null, 2) : '';
  const name = report ? probeFileName('native', new Date(report.meta.zaman)) : '';
  const errors = report ? validateProbeReport(report) : [];
  const act = (fn: () => Promise<unknown>, ok: string) => () => {
    fn()
      .then(() => setMessage(ok))
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : String(e)));
  };

  const s = report?.summary.sayım;
  const groups = s
    ? [
        { label: 'Var', n: s.var + s.etkili },
        { label: 'Etkisiz', n: s['kabul-edildi-etkisiz'] },
        { label: 'Yok', n: s.yok },
        { label: 'Hata', n: s.hata },
      ]
    : [];

  return (
    <View style={st.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={st.scroll}>
        <Text style={st.h1}>Curate Probe</Text>
        <Text style={st.lead}>
          Kameranın ve donanımın üçüncü taraf uygulamaya ne verdiğini ölçer. Görüntü kaydedilmez, hiçbir veri gönderilmez; rapor yalnız bu telefonda oluşur.
        </Text>

        {phase === 'hazır' && (
          <View style={st.card}>
            <Text style={st.cardTitle}>Başlamadan önce</Text>
            <Text style={st.body}>• Arka kamerayı aydınlık ve karanlık bölgesi olan sabit bir sahneye tut (ör. pencere ve duvar), telefonu kıpırdatma.</Text>
            <Text style={st.body}>• Yalnız kamera izni istenir (mikrofon ve konum istenmez).</Text>
            <Text style={st.body}>• Test yaklaşık 30–60 saniye sürer; ekranda önizleme görünmez.</Text>
          </View>
        )}

        {phase === 'hazır' && (
          <Pressable style={({ pressed }) => [st.primary, pressed && st.pressed]} onPress={start} accessibilityRole="button">
            <Text style={st.primaryText}>Testi başlat</Text>
          </Pressable>
        )}

        {phase === 'çalışıyor' && (
          <View style={st.card}>
            {NATIVE_STEPS.map((label, i) => (
              <View key={label} style={st.stepRow}>
                {i === step ? <ActivityIndicator color={C.ink1} /> : <Text style={[st.stepMark, { color: i < step ? C.success : C.ink3 }]}>{i < step ? '✓' : '○'}</Text>}
                <Text style={[st.body, { color: i > step ? C.ink3 : C.ink1 }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {phase === 'bitti' && fatal && <Text style={[st.card, st.body, { color: C.danger }]}>Test durdu: {fatal}</Text>}

        {phase === 'bitti' && report && (
          <>
            <Text style={st.done}>
              Test bitti · {Math.round(report.meta.süreMs / 1000)} sn · {report.tests.length} ölçüm
            </Text>
            <View style={st.grid}>
              {groups.map((g) => (
                <View key={g.label} style={st.count}>
                  <Text style={[st.countN, g.label === 'Hata' && g.n > 0 && { color: C.danger }]}>{g.n}</Text>
                  <Text style={st.caption}>{g.label}</Text>
                </View>
              ))}
            </View>

            <View style={st.card}>
              <Text style={st.cardTitle}>Ne mümkün</Text>
              {MATRIX_KEYS.map((k) => {
                const m = report.summary.matris[k];
                return (
                  <View key={k} style={st.row}>
                    <View style={st.rowHead}>
                      <Text style={st.body}>{MATRIX_LABELS[k]}</Text>
                      <Text style={[st.status, { color: STATUS_COLOR[m.durum] }]}>{STATUS_LABEL[m.durum]}</Text>
                    </View>
                    <Text style={st.caption}>{m.ayrıntı}</Text>
                  </View>
                );
              })}
            </View>

            <Text style={st.cardTitle}>Dışa aktar</Text>
            <Text style={st.caption}>{name}</Text>
            <Pressable style={({ pressed }) => [st.primary, pressed && st.pressed]} onPress={act(() => shareReport(name, json), 'Paylaşım sayfası açıldı')} accessibilityRole="button">
              <Text style={st.primaryText}>Paylaş</Text>
            </Pressable>
            <View style={st.pair}>
              <Pressable style={({ pressed }) => [st.secondary, pressed && st.pressed]} onPress={act(() => saveToPickedFolder(name, json), 'Seçilen klasöre kaydedildi')} accessibilityRole="button">
                <Text style={st.secondaryText}>İndirilenlere kaydet</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [st.secondary, pressed && st.pressed]} onPress={act(() => copyReport(json), 'Panoya kopyalandı')} accessibilityRole="button">
                <Text style={st.secondaryText}>Kopyala</Text>
              </Pressable>
            </View>
            {message && <Text style={st.body}>{message}</Text>}
            <Text style={[st.caption, errors.length > 0 && { color: C.danger }]}>
              Şema doğrulaması: {errors.length ? errors.join('; ') : 'geçti (probe/v1)'}
            </Text>

            <Pressable style={st.disclosure} onPress={() => setShowTests((v) => !v)} accessibilityRole="button">
              <Text style={st.body}>
                {showTests ? '▾' : '▸'} Tüm ölçümler ({report.tests.length})
              </Text>
            </Pressable>
            {showTests &&
              report.tests.map((t) => (
                <View key={t.id} style={st.row}>
                  <View style={st.rowHead}>
                    <Text style={[st.body, { flex: 1 }]}>{t.ad}</Text>
                    <Text style={[st.status, { color: STATUS_COLOR[t.durum] }]}>{STATUS_LABEL[t.durum]}</Text>
                  </View>
                  <Text style={st.caption}>{t.ayrıntı}</Text>
                </View>
              ))}

            <Pressable style={st.disclosure} onPress={() => setShowJson((v) => !v)} accessibilityRole="button">
              <Text style={st.body}>{showJson ? '▾' : '▸'} Ham JSON</Text>
            </Pressable>
            {showJson && (
              <Text selectable style={st.mono}>
                {json}
              </Text>
            )}

            <Pressable style={({ pressed }) => [st.secondary, pressed && st.pressed]} onPress={start} accessibilityRole="button">
              <Text style={st.secondaryText}>Testi yeniden başlat</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base },
  scroll: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 40, gap: 14 },
  h1: { color: C.ink1, fontSize: 28, fontWeight: '600', letterSpacing: -0.8 },
  lead: { color: C.ink2, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: C.surface, borderColor: C.separator, borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  cardTitle: { color: C.ink1, fontSize: 16, fontWeight: '600' },
  body: { color: C.ink1, fontSize: 14, lineHeight: 20 },
  caption: { color: C.ink3, fontSize: 12, lineHeight: 16 },
  done: { color: C.ink1, fontSize: 14, fontWeight: '500' },
  primary: { minHeight: 48, borderRadius: 999, backgroundColor: C.accentFill, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: C.ink1, fontSize: 16, fontWeight: '600' },
  secondary: { flex: 1, minHeight: 44, borderRadius: 999, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryText: { color: C.ink1, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  pair: { flexDirection: 'row', gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
  stepMark: { width: 20, textAlign: 'center', fontSize: 16 },
  grid: { flexDirection: 'row', gap: 8 },
  count: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: C.surface, borderColor: C.separator, borderWidth: 1, borderRadius: 18 },
  countN: { color: C.ink1, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: { borderTopColor: C.separator, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  status: { fontSize: 14, fontWeight: '500' },
  disclosure: { minHeight: 44, justifyContent: 'center' },
  mono: { color: C.ink2, fontSize: 12, fontFamily: 'monospace', backgroundColor: C.surface, padding: 12, borderRadius: 12 },
});
