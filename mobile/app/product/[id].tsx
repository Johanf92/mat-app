import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FoodProduct, getProduct } from '../../src/openFoodFacts';
import { amount, NOVA, novaInfo, type NovaGroup } from '../../src/catalog';
import { useMarket } from '../../src/MarketContext';
import { colors, InfoSheet, SourceLink, NovaBadge } from '../../src/ui';
import { ADDITIVE_GENERAL_SOURCE, formatAdditiveCode, summarizeAdditives, type AdditiveInfo } from '../../src/additives';
import { comparableCategory, findAlternatives, productProfile } from '../../src/alternatives';

type Topic = 'nova' | 'ingredients' | 'nutrition' | 'additives' | null;
function Accordion({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(false);
  return <View style={styles.accordion}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.accordionHeader}>
      <Text style={styles.accordionTitle}>{title}</Text><Text style={styles.arrow}>{open ? '−' : '+'}</Text>
    </Pressable>{open && <View style={styles.details}>{children}</View>}
  </View>;
}
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { market } = useMarket();
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [topic, setTopic] = useState<Topic>(null);
  const [fullIngredients, setFullIngredients] = useState(false);
  const [selectedAdditive,setSelectedAdditive]=useState<AdditiveInfo|null>(null);
  const [alternatives,setAlternatives]=useState<FoodProduct[]>([]);
  const [alternativesLoading,setAlternativesLoading]=useState(false);
  const [alternativesError,setAlternativesError]=useState('');
  const [alternativesRequested,setAlternativesRequested]=useState(false);
  async function loadAlternatives(){
    if(!product||alternativesLoading||!comparableCategory(product))return;
    setAlternativesLoading(true);setAlternativesRequested(true);setAlternativesError('');setAlternatives([]);
    try{setAlternatives(await findAlternatives(product,market));}
    catch{setAlternativesError('Kunne ikke hente alternativer akkurat nå.');}
    finally{setAlternativesLoading(false);}
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setProduct(null); setError(''); setFullIngredients(false); setTopic(null); setAlternatives([]); setAlternativesRequested(false); setSelectedAdditive(null);
    getProduct(id ?? '', controller.signal).then(p => {
      if (!controller.signal.aborted) { setProduct(p); if (!p) setError('Produktet finnes ikke i Open Food Facts.'); }
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error && e.name !== 'TypeError' ? e.message : 'Kunne ikke hente produktet. Sjekk nettet og prøv igjen.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  const p = product;
  const nova = novaInfo(p?.nova ?? null);
  const alternativesSupported = p !== null && comparableCategory(p) !== null;
  // The heading, cards and raw-data disclosure share the same presentation model.
  const additives = summarizeAdditives(p?.additives ?? []);
  const titles: Record<Exclude<Topic, null>, string> = { nova: 'Hva betyr NOVA?', ingredients: 'Om ingredienslisten', nutrition: 'Slik leser du næringsinnhold', additives: 'Om tilsetningsstoffer' };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}><Text style={styles.back}>← Tilbake til søk</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.page}>
      {loading && <ActivityIndicator color={colors.green} size="large" />}
      {!!error && <View style={styles.details}><Text accessibilityRole="alert" style={styles.body}>{error}</Text><Pressable onPress={() => setRetry(x => x + 1)} style={styles.infoButton}><Text style={styles.info}>Prøv igjen</Text></Pressable></View>}
      {p && <>
        <View style={styles.productHeader}>
          {p.image ? <Image source={{ uri: p.image }} style={styles.photo} resizeMode="contain" /> : <View style={styles.photo} />}
          <View style={styles.meta}><Text style={styles.brand}>{p.brand}</Text><Text accessibilityRole="header" style={styles.title}>{p.name}</Text>{!!p.quantity && <Text style={styles.caption}>{p.quantity}</Text>}</View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Bearbeidingsgrad. ' + (p.nova ? 'NOVA ' + p.nova : 'Ikke oppgitt') + '. Trykk for forklaring.'}
          onPress={() => setTopic('nova')} style={[styles.novaCard, { backgroundColor: nova.background, borderColor: nova.accent }]}>
          <View style={styles.spread}><Text style={[styles.novaCaption, { color: nova.foreground }]}>BEARBEIDINGSGRAD</Text><Text style={{ color: nova.foreground }}>ⓘ</Text></View>
          <Text style={[styles.novaTitle, { color: nova.foreground }]}>{p.nova ? 'NOVA ' + p.nova + ' · ' + nova.label : 'Bearbeidingsgrad ikke oppgitt'}</Text>
          <Text style={[styles.caption, { color: nova.foreground }]}>{p.nova ? 'Trykk for forklaring. Fargen viser bearbeiding, ikke en helsescore.' : 'Vi gjetter ikke ut fra produktnavnet. Trykk for å lese om NOVA.'}</Text>
        </Pressable>
        <View style={styles.sectionHeader}><Text style={styles.section}>Makroer</Text><Pressable accessibilityRole="button" accessibilityLabel="Forklaring av næringsinnhold" onPress={() => setTopic('nutrition')} style={styles.infoButton}><Text style={styles.info}>Hva betyr tallene? ⓘ</Text></Pressable></View>
        <Text style={styles.caption}>Per 100 g / 100 ml, slik datakilden oppgir verdiene.</Text>
        <View style={styles.macros}>{([['Protein', p.protein], ['Fett', p.fat], ['Karbohydrat', p.carbs]] as const).map(([label, value]) => <View key={label} style={styles.macro}><Text style={styles.caption}>{label}</Text><Text style={styles.macroValue}>{value === null ? '—' : amount(value)}</Text></View>)}</View>
        {[p.protein, p.fat, p.carbs].some(x => x === null) && <Text style={styles.caption}>— betyr at opplysningen mangler, ikke at mengden er null.</Text>}
        <View style={styles.accordions}>
          <Accordion key={p.code + '-ingredients'} title="Ingredienser">
            <Text style={styles.caption}>{['no', 'nb'].includes(p.ingredientLanguage) ? 'Tekst registrert i norsk språkfelt.' : 'Tekst fra datakilden. Kan inneholde flere språk; ikke automatisk oversatt.'}</Text>
            <Text style={styles.body} numberOfLines={fullIngredients ? undefined : 5}>{p.ingredients || 'Ingredienslisten er ikke oppgitt.'}</Text>
            {!!p.ingredients && <Pressable accessibilityRole="button" accessibilityState={{ expanded: fullIngredients }} onPress={() => setFullIngredients(!fullIngredients)} style={styles.infoButton}><Text style={styles.info}>{fullIngredients ? 'Vis mindre' : 'Vis hele teksten'}</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={() => setTopic('ingredients')} style={styles.infoButton}><Text style={styles.info}>Om ingredienslisten ⓘ</Text></Pressable>
          </Accordion>
          <Accordion key={p.code + '-nutrition'} title="Alt næringsinnhold">
            <Text style={styles.caption}>Per 100 g / 100 ml. Ingen porsjoner er beregnet.</Text>
            {([['Energi', p.energy, 'kcal'], ['Protein', p.protein, 'g'], ['Fett', p.fat, 'g'], ['Karbohydrat', p.carbs, 'g'], ['Hvorav sukkerarter', p.sugar, 'g'], ['Fiber', p.fiber, 'g'], ['Salt', p.salt, 'g']] as const).map(([label, value, unit]) => <View key={label} style={styles.nutrientRow}><Text style={styles.body}>{label}</Text><Text style={styles.nutrientValue}>{amount(value, unit)}</Text></View>)}
          </Accordion>
          <Accordion key={p.code + '-additives'} title={additives.title}>
            {additives.rawTags.length === 0 && <Text style={styles.body}>Ingen opplysninger registrert. Dette bekrefter ikke at produktet er uten tilsetningsstoffer.</Text>}
            {!!additives.groupingNote && <Text style={styles.caption}>{additives.groupingNote}</Text>}
            {additives.items.map(a => <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={'Les om ' + formatAdditiveCode(a.id) + ', ' + a.name} onPress={() => setSelectedAdditive(a)} style={styles.additiveRow}>
              <View style={{ flex: 1, gap: 3 }}><Text style={styles.additiveName}>{formatAdditiveCode(a.id)} · {a.name}</Text><Text style={styles.caption}>{a.role}</Text></View><Text style={styles.arrow}>ⓘ</Text>
            </Pressable>)}
            {additives.unrecognized.map(raw => <View key={raw} style={styles.additiveRow}>
              <View style={{ flex: 1, gap: 3 }}><Text style={styles.additiveName}>{raw}</Text><Text style={styles.caption}>Ukjent kodeformat fra datakilden. Oppføringen er beholdt, men ikke tolket.</Text></View>
            </View>)}
            <Text style={styles.caption}>Registreringene kan være ufullstendige. Originalkodene er tilgjengelige under «Kilde og datakvalitet».</Text>
            <Pressable accessibilityRole="button" onPress={() => setTopic('additives')} style={styles.infoButton}><Text style={styles.info}>Hva betyr E-numrene? ⓘ</Text></Pressable>
          </Accordion>
          <Accordion key={p.code + '-allergens'} title="Allergenopplysninger">
            <Text style={styles.body}>{p.allergens.length ? p.allergens.map(x => x.replace(/^[a-z]{2}:/, '')).join(', ') : 'Allergenopplysninger er ikke registrert.'}</Text>
            <Text style={styles.warning}>Manglende opplysninger betyr ikke allergenfritt. Kontroller alltid emballasjen ved allergi.</Text>
          </Accordion>
          <View testID="product-alternatives" style={styles.alternatives}>
            <Text accessibilityRole="header" style={styles.alternativesTitle}>Lignende produkter</Text>
            {alternativesSupported ? <>
              <Text style={styles.caption}>Vi ser etter {productProfile(p)?.label} {market.tag ? 'registrert for ' + market.name : 'fra alle land'}. Forslagene vises her i appen.</Text>
              <Pressable testID="find-alternatives" accessibilityRole="button" accessibilityLabel="Finn alternativer i Matkontroll"
                accessibilityHint="Søker og viser treff på denne siden, uten å åpne nettleseren."
                accessibilityState={{ disabled: alternativesLoading, busy: alternativesLoading }}
                style={[styles.altButton, alternativesLoading && styles.altButtonDisabled]}
                onPress={() => { void loadAlternatives(); }} disabled={alternativesLoading}>
                <Text style={styles.altButtonText}>{alternativesLoading ? 'Henter alternativer…' : alternativesRequested ? 'Søk igjen' : 'Finn alternativer'}</Text>
              </Pressable>
              {alternativesLoading && <ActivityIndicator accessibilityLabel="Henter alternativer" color={colors.green} />}
              {!!alternativesError && <Text accessibilityRole="alert" style={styles.warning}>{alternativesError}</Text>}
              {alternativesRequested && !alternativesLoading && !alternativesError && alternatives.length === 0 && <Text style={styles.caption}>Ingen relevante alternativer med tilstrekkelige data ble funnet.</Text>}
              {!alternativesLoading && !alternativesError && alternatives.map(other => <View key={other.code} style={styles.altRow}>
                {other.image ? <Image source={{ uri: other.image }} style={styles.altImage} resizeMode="contain" /> : <View style={styles.altImage} />}
                <View style={{ flex: 1, gap: 6 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={'Se ' + other.name} onPress={() => router.push({ pathname: '/product/[id]', params: { id: other.code } })}>
                    <Text style={styles.additiveName}>{other.name}</Text><Text style={styles.caption}>{other.brand}</Text>
                  </Pressable>
                  <Text style={styles.caption}>Protein {amount(other.protein)} · Fett {amount(other.fat)} · Karbohydrat {amount(other.carbs)}</Text>
                  <NovaBadge group={other.nova} compact />
                  <Pressable accessibilityRole="button" accessibilityLabel={'Sammenlign ' + p.name + ' med ' + other.name}
                    onPress={() => router.push({ pathname: '/compare', params: { left: p.code, right: other.code } })} style={styles.compareButton}>
                    <Text style={styles.compareText}>Sammenlign med denne →</Text>
                  </Pressable>
                </View>
              </View>)}
              {alternativesRequested && !alternativesLoading && !alternativesError && alternatives.length > 0 && <Text style={styles.caption}>Samme kategori er et utgangspunkt, ikke en garanti for samme bruksområde, bedre innhold eller tilgjengelighet i butikk.</Text>}
            </> : <Text testID="alternatives-unavailable" style={styles.caption}>Alternativsøk støttes ikke for denne produktkategorien ennå.</Text>}
            <Pressable accessibilityRole="button" testID="manual-compare"
              onPress={() => router.push({ pathname: '/compare', params: { left: p.code } })} style={styles.manualCompare}>
              <Text style={styles.compareText}>Velg en annen matvare selv →</Text>
            </Pressable>
          </View>
          <Accordion key={p.code + '-source'} title="Kilde og datakvalitet">
            <Text style={styles.body}>Dataene kommer fra Open Food Facts og kan være feil eller ufullstendige.</Text>
            <Text style={styles.body}>{market.tag === null ? 'Du søker i alle land.' : p.countries.includes(market.tag) ? 'Registrert for ' + market.name + '. Dette er ikke en lagerstatus.' : 'Ikke registrert for ' + market.name + ' i dataene vi har. Varen kan likevel finnes der.'}</Text>
            <Text style={styles.caption}>Strekkode: {p.code}</Text>
            {!!additives.rawTags.length && <Text selectable style={styles.caption}>Originale tilsetningsstoffkoder: {additives.rawTags.join(', ')}</Text>}
            {p.modifiedAt !== null && p.modifiedAt > 0 && <Text style={styles.caption}>Sist endret hos kilden: {new Date(p.modifiedAt * 1000).toLocaleDateString('nb-NO')}. Dette er ikke en kvalitetsgodkjenning.</Text>}
            <Text style={styles.caption}>Ekstern kildeside, ikke alternativsøket i Matkontroll.</Text>
            <SourceLink label="Åpne originalproduktet i nettleseren" url={'https://world.openfoodfacts.org/product/' + p.code} />
          </Accordion>
        </View>
        <Text style={styles.caption}>Velg selv. Vi viser innhold og bearbeiding, ikke en fasit på hva du skal spise.</Text>
        <Text style={styles.caption}>Produktdata og bilder: Open Food Facts. Kildelenken ligger under «Kilde og datakvalitet».</Text>
      </>}
    </ScrollView>
    <InfoSheet visible={selectedAdditive !== null} title={selectedAdditive ? formatAdditiveCode(selectedAdditive.id) + ' · ' + selectedAdditive.name : ''} onClose={() => setSelectedAdditive(null)}>
      <Text style={styles.body}>{selectedAdditive?.description}</Text>
      <Text style={styles.caption}>Mulig funksjon: {selectedAdditive?.role}. Den konkrete funksjonen i produktet må bekreftes i ingredienslisten. Dette er ikke en individuell sikkerhetsvurdering.</Text>
      {!!selectedAdditive && <SourceLink label={selectedAdditive.source === ADDITIVE_GENERAL_SOURCE ? 'Generell informasjon om tilsetningsstoffer (EFSA)' : 'E-numre og stoffnavn (Food Standards Agency)'} url={selectedAdditive.source} />}
    </InfoSheet>
    <InfoSheet visible={topic !== null} title={topic ? titles[topic] : ''} onClose={() => setTopic(null)}>
      {topic === 'nova' && <>
        <Text style={styles.body}>NOVA grupperer matvarer etter bearbeiding. Fargene er Matkontrolls visuelle hjelpemiddel, ikke en offisiell helseskala.</Text>
        {([1, 2, 3, 4] as NovaGroup[]).map(group => <View key={group} style={[styles.novaExplanation, { backgroundColor: NOVA[group].background, borderColor: NOVA[group].accent, borderWidth: p?.nova === group ? 2 : 0 }]}>
          <Text style={[styles.explanationTitle, { color: NOVA[group].foreground }]}>NOVA {group}{p?.nova === group ? ' · Dette produktet' : ''}</Text><Text style={[styles.body, { color: NOVA[group].foreground }]}>{NOVA[group].detail}</Text>
        </View>)}
        <Text style={styles.body}>Gruppene beskriver ulike typer bearbeiding. NOVA 2 er matlagingsingredienser, ikke et eget trinn på en sunnhetsskala. Grå betyr at informasjon mangler.</Text>
        <SourceLink label="Kilde: Open Food Facts om NOVA" url="https://world.openfoodfacts.org/nova" />
      </>}
      {topic === 'nutrition' && <><Text style={styles.body}>Protein, fett og karbohydrat vises separat. Sukkerarter er en del av karbohydratene, ikke noe du skal legge til en gang til.</Text><Text style={styles.body}>Sukkerarter inkluderer naturlig forekommende sukker. Tallet forteller ikke alene hvor mye som er tilsatt. Sammenlign samme type vare og samme målegrunnlag.</Text><Text style={styles.caption}>Målegrunnlaget er ikke alltid entydig i API-et. Derfor viser vi ikke beregnede porsjoner eller automatiske rangeringer ennå.</Text></>}
      {topic === 'ingredients' && <><Text style={styles.body}>Dette er teksten datakilden har registrert, ikke en oppskrift vi har utledet. Vi rydder bare i tegnkoder som &amp;quot; og beholder hele teksten.</Text><Text style={styles.body}>Feilregistrerte lister kan inneholde flere språk eller næringsdeklarasjon. Vi kutter ikke bort innhold automatisk, siden viktige opplysninger kan gå tapt.</Text></>}
      {topic === 'additives' && <>
        <Text style={styles.body}>Et E-nummer identifiserer et tilsetningsstoff. Koden alene sier ikke hvor mye som er brukt i produktet.</Text>
        <Text style={styles.body}>Trykk på en oppføring for en kort forklaring. Forklaringsregisteret er foreløpig lite. Ukjente koder beholdes uten at vi gjetter funksjonen.</Text>
        <Text style={styles.body}>Kjente samlegrupper og undervarianter vises sammen, slik at samme registrering ikke telles to ganger. Antallet gjelder oppføringene vi kan vise, ikke en kontroll av alle stoffene i varen.</Text>
        <Text style={styles.caption}>Ingen registrerte koder betyr ikke at vi har bekreftet at varen er fri for tilsetningsstoffer.</Text>
        <SourceLink label="Generell informasjon om tilsetningsstoffer (EFSA)" url={ADDITIVE_GENERAL_SOURCE} />
      </>}
    </InfoSheet>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.page }, toolbar: { paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  backButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 }, back: { fontSize: 16, fontWeight: '700', color: colors.green },
  page: { padding: 22, paddingBottom: 30, gap: 16 }, productHeader: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  photo: { width: 80, height: 100, borderRadius: 14, backgroundColor: '#E9EFE9' }, meta: { flex: 1, gap: 5 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink }, brand: { fontSize: 14, color: colors.muted },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink }, caption: { fontSize: 12, lineHeight: 19, color: colors.muted },
  novaCard: { borderWidth: 1, padding: 18, borderRadius: 18, gap: 9 }, spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  novaCaption: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }, novaTitle: { fontSize: 21, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }, section: { fontSize: 18, fontWeight: '800', color: colors.ink },
  infoButton: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 }, info: { fontSize: 13, fontWeight: '700', color: colors.green },
  macros: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' }, macro: { flex: 1, minWidth: 85, padding: 12, gap: 7, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  macroValue: { fontSize: 18, fontWeight: '700', color: colors.ink }, accordions: { marginTop: 2 }, accordion: { borderTopWidth: 1, borderTopColor: colors.line },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17 }, accordionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  arrow: { fontSize: 24, color: colors.green }, details: { paddingBottom: 17, gap: 12 }, nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  nutrientValue: { fontSize: 15, lineHeight: 23, color: colors.ink, fontWeight: '600' }, warning: { fontSize: 13, lineHeight: 21, color: '#825617' },
  additiveRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: 'white' },
  additiveName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  alternatives: { gap: 10, paddingVertical: 17, borderTopWidth: 1, borderTopColor: colors.line },
  alternativesTitle: { fontSize: 16, fontWeight: '700', color: colors.ink }, altButtonDisabled: { opacity: 0.5 },
  altButton: { minHeight: 44, borderWidth: 1, borderColor: colors.green, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, alignItems: 'center', alignSelf: 'flex-start' },
  altButtonText: { fontSize: 14, fontWeight: '700', color: colors.green },
  altRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: 'white' },
  compareButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 7 },
  manualCompare: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 7 },
  compareText: { fontSize: 14, color: colors.green, fontWeight: '700' },
  altImage: { width: 58, height: 70, backgroundColor: '#EBF1EB', borderRadius: 9 },
  novaExplanation: { padding: 13, borderRadius: 12, gap: 4 }, explanationTitle: { fontSize: 15, fontWeight: '800' },
});
