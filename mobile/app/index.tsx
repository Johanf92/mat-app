import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FoodProduct, getProduct, searchProducts } from '../src/openFoodFacts';
import { useMarket } from '../src/MarketContext';
import { colors, MarketPicker, NovaBadge, SourceLink } from '../src/ui';

export default function Home() {
  const router = useRouter();
  const { market } = useMarket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ query: string; market: string; barcode: boolean } | null>(null);
  const pending = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  function reset() {
    pending.current?.abort(); sequence.current += 1;
    setLoading(false); setResults([]); setError(''); setSubmitted(null);
  }
  useEffect(() => { reset(); }, [market.code]);
  useEffect(() => () => { pending.current?.abort(); sequence.current += 1; }, []);
  async function search() {
    const q = query.trim();
    if (q.length < 2 || loading) return;
    Keyboard.dismiss(); pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    const request = ++sequence.current;
    const barcode = q.replace(/\s/g, '');
    const isBarcode = /^\d{8,14}$/.test(barcode);
    setLoading(true); setError(''); setResults([]);
    setSubmitted({ query: q, market: market.code, barcode: isBarcode });
    try {
      const items = isBarcode ? [await getProduct(barcode, controller.signal)].filter((p): p is FoodProduct => p !== null)
        : await searchProducts(q, market, controller.signal);
      if (!controller.signal.aborted && request === sequence.current) setResults(items);
    } catch (e) {
      if (!controller.signal.aborted && request === sequence.current) setError(e instanceof Error && e.name !== 'TypeError' ? e.message : 'Kunne ikke hente produkter. Sjekk nettet og prøv igjen.');
    } finally { if (!controller.signal.aborted && request === sequence.current) setLoading(false); }
  }
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
      <View style={styles.header}><Text style={styles.brand}>matkontroll</Text><MarketPicker /></View>
      <View style={styles.intro}><Text style={styles.title}>Vit hva du spiser.</Text><Text style={styles.subtitle}>Søk etter matvaren. Forstå innholdet.</Text></View>
      <View style={styles.searchBox}>
        <TextInput accessibilityLabel="Produkt, merke eller strekkode" placeholder="Produkt, merke eller strekkode" placeholderTextColor="#75837A"
          value={query} onChangeText={value => { reset(); setQuery(value); }} style={styles.input} autoCorrect={false} returnKeyType="search"
          onSubmitEditing={() => { void search(); }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Søk" accessibilityState={{ disabled: loading || query.trim().length < 2 }}
          disabled={loading || query.trim().length < 2} onPress={() => { void search(); }} style={[styles.searchButton, (loading || query.trim().length < 2) && styles.disabled]}>
          <Text style={styles.buttonText}>Søk</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>{submitted?.barcode ? 'Strekkodeoppslag i alle land.' : market.tag ? 'Søker i produkter registrert for ' + market.name + '.' : 'Søker i produkter fra alle land.'}</Text>
      {!submitted && <Pressable accessibilityRole="button" onPress={() => router.push('/scanner')} style={styles.camera}>
        <Text style={styles.cameraTitle}>▣  Skann strekkode med kamera</Text><Text style={styles.caption}>Hold kameraet foran strekkoden. Vi finner produktet automatisk.</Text>
      </Pressable>}
      {loading && <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.caption}>Henter produkter…</Text></View>}
      {!!error && <Text accessibilityRole="alert" style={styles.message}>{error}</Text>}
      {submitted && !loading && !error && <>
        <Text style={styles.section}>{results.length ? 'Søkeresultater' : 'Ingen treff'}</Text>
        {!results.length && <Text style={styles.subtitle}>{submitted.barcode ? 'Strekkoden finnes ikke i datakilden.' : 'Prøv et annet søkeord, strekkode eller «Alle land». Søkeindeksen kan mangle nyere varer selv når de finnes i produktdatabasen.'}</Text>}
        {results.map(p => <Pressable key={p.code} accessibilityRole="button" accessibilityLabel={'Vis ' + p.name}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.code } })} style={styles.product}>
          {p.image ? <Image source={{ uri: p.image }} style={styles.thumb} resizeMode="contain" /> : <View style={styles.thumb} />}
          <View style={styles.productInfo}><Text numberOfLines={2} style={styles.productName}>{p.name}</Text><Text numberOfLines={1} style={styles.caption}>{p.brand}</Text><NovaBadge group={p.nova} compact /></View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>)}
        {!!results.length && <Text style={styles.caption}>Viser opptil 20 treff. Landregistrering er ikke en lagerstatus.</Text>}
      </>}
      <SourceLink label="Produktdata og bilder: Open Food Facts" url="https://world.openfoodfacts.org/" />
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page }, page: { padding: 22, paddingBottom: 32, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  brand: { fontSize: 22, fontWeight: '800', color: colors.green }, intro: { marginTop: 26, gap: 10, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink }, subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  searchBox: { gap: 10 }, input: { borderWidth: 1, borderColor: colors.line, backgroundColor: 'white', padding: 17, borderRadius: 15, fontSize: 16, color: colors.ink },
  searchButton: { minHeight: 50, backgroundColor: colors.green, borderRadius: 13, padding: 15, alignItems: 'center' },
  disabled: { opacity: 0.5 }, buttonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  caption: { fontSize: 12, lineHeight: 19, color: colors.muted }, camera: { borderWidth: 1, borderColor: '#246C4C', backgroundColor: '#E5F0E7', padding: 18, borderRadius: 17, gap: 7 },
  cameraTitle: { fontSize: 17, fontWeight: '700', color: colors.green }, loading: { paddingVertical: 20, gap: 10, alignItems: 'center' },
  message: { padding: 16, borderRadius: 13, backgroundColor: '#FFF0DD', color: '#724300', lineHeight: 23 }, section: { fontSize: 19, fontWeight: '800', color: colors.ink },
  product: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, padding: 13, borderRadius: 17 },
  thumb: { width: 57, height: 75, borderRadius: 9, backgroundColor: '#EDF2ED' }, productInfo: { flex: 1, gap: 6 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.ink }, arrow: { color: colors.green, fontSize: 25 },
});
