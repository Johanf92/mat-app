import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FoodProduct, getProduct } from '../../src/openFoodFacts';
import { amount, NOVA, novaInfo, type NovaGroup } from '../../src/catalog';
import { useMarket } from '../../src/MarketContext';
import { colors, InfoSheet, SourceLink, NovaBadge } from '../../src/ui';
import { ADDITIVE_GENERAL_SOURCE, additiveSourceLabel, formatAdditiveCode, summarizeAdditives, type AdditiveInfo } from '../../src/additives';
import { ingredientTerms, type IngredientTermInfo } from '../../src/ingredientTerms';
import { comparableCategory, findAlternatives, productProfile, candidateNote, fallbackProductIcon } from '../../src/alternatives';
import { displayIngredientText, ingredientCodeNote } from '../../src/ingredientEvidence';
import { productAdditiveEvidence, additiveEvidenceLabel } from '../../src/productEvidence';
import { productDataStatus } from '../../src/productDataStatus';
import { formatAllergenTags } from '../../src/allergens';
import { nutriScoreDescription, nutriScoreLabel, NUTRI_SCORE_SOURCE, NORWEGIAN_LABEL_SOURCE } from '../../src/nutriScore';
import { productSnapshot } from '../../src/productSnapshot';
import { macroEnergy, roundedMacroEnergy } from '../../src/macroEnergy';
import { verifiedProcessingDiscovery } from '../../src/discovery';

function MacroEnergyRing({protein,carbs,fat}:{protein:number|null;carbs:number|null;fat:number|null}) {
 const energy=macroEnergy(protein,carbs,fat);
 if(!energy)return <Text style={styles.caption}>Energifordeling kan ikke beregnes fra de registrerte makroverdiene.</Text>;
 const rounded=roundedMacroEnergy(energy);
 const parts=[
  {label:'Protein',pct:energy.protein,color:'#4778C5'},
  {label:'Karbohydrater',pct:energy.carbs,color:'#218F7A'},
  {label:'Fett',pct:energy.fat,color:'#C68B3E'},
 ];
 // A segmented native View ring avoids an additional SVG dependency.
 const ticks=180,radius=50,center=64;
 return <View testID="macro-energy-ring" style={styles.energyRow}>
  <View style={styles.energyRing} accessibilityLabel="Energifordeling mellom protein, karbohydrater og fett">
   {Array.from({length:ticks},(_,i)=>{
     const pct=(i+0.5)/ticks*100;
     const color=pct<energy.protein?parts[0].color:pct<energy.protein+energy.carbs?parts[1].color:parts[2].color;
     const theta=(i/ticks*360-90)*Math.PI/180;
     return <View key={i} style={{position:'absolute',width:5,height:11,backgroundColor:color,
       left:center+radius*Math.cos(theta)-2.5,top:center+radius*Math.sin(theta)-5.5,
       transform:[{rotate:(i/ticks*360)+'deg'}]}}/>;
   })}
   <View style={styles.energyCenter}><Text style={styles.energyCenterMain}>E%</Text><Text style={styles.energyCenterSmall}>av makroenergi</Text></View>
  </View>
  <View style={styles.energyLegend}>{parts.map(part=><View key={part.label} style={styles.energyLegendRow}>
    <View style={[styles.energyDot,{backgroundColor:part.color}]}/>
    <Text style={styles.energyLegendLabel}>{part.label}</Text>
    <Text style={styles.energyLegendPct}>{part.label==='Protein'?rounded.protein:part.label==='Fett'?rounded.fat:rounded.carbs} %</Text>
  </View>)}</View>
 </View>;
}

type Topic = 'nova' | 'nutriscore' | 'ingredients' | 'nutrition' | 'additives' | null;
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
  const [selectedTerm,setSelectedTerm]=useState<IngredientTermInfo|null>(null);
  const [imageLoadFailed,setImageLoadFailed]=useState(false);
  const [failedAlternativeImages,setFailedAlternativeImages]=useState<string[]>([]);
  const [alternatives,setAlternatives]=useState<FoodProduct[]>([]);
  const [discovery,setDiscovery]=useState<FoodProduct|null>(null);
  const [alternativesLoading,setAlternativesLoading]=useState(false);
  const [alternativesError,setAlternativesError]=useState('');
  const [alternativesRequested,setAlternativesRequested]=useState(false);
  async function loadAlternatives(){
    if(!product||alternativesLoading||!comparableCategory(product))return;
    setAlternativesLoading(true);setAlternativesRequested(true);setAlternativesError('');setAlternatives([]);setFailedAlternativeImages([]);
    try{setAlternatives(await findAlternatives(product,market));}
    catch(e){setAlternativesError(e instanceof Error ? e.message : 'Kunne ikke hente alternativer akkurat nå.');}
    finally{setAlternativesLoading(false);}
  }
  useEffect(() => {
    const controller = new AbortController();
    setDiscovery(null);
    setLoading(true); setProduct(null); setImageLoadFailed(false); setFailedAlternativeImages([]); setError(''); setFullIngredients(false); setTopic(null); setAlternatives([]); setAlternativesRequested(false); setSelectedAdditive(null);setSelectedTerm(null);
    getProduct(id ?? '', controller.signal).then(p => {
      if (!controller.signal.aborted) { setProduct(p); if (!p) setError('Produktet finnes ikke i Open Food Facts.'); }
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error && e.name !== 'TypeError' ? e.message : 'Kunne ikke hente produktet. Sjekk nettet og prøv igjen.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, retry]);
  useEffect(() => {
    if (!product || product.nova === null || product.nova <= 1 || !comparableCategory(product)) return;
    const controller = new AbortController();
    // Keep this optional: no loading spinner, no warning, and no extra requests
    // when the source itself has no documented processing classification.
    (async () => {
      try {
        const hits = await findAlternatives(product, market, controller.signal);
        // Verify only the first few candidates directly, never trust stale NOVA
        // in the search index, and stop at one useful discovery.
        for (const hit of hits.slice(0, 3)) {
          if (controller.signal.aborted) return;
          const fresh = await getProduct(hit.code, controller.signal);
          if (fresh && verifiedProcessingDiscovery(product, fresh)) {
            if (!controller.signal.aborted) setDiscovery(fresh);
            return;
          }
        }
      } catch { /* Discovery is optional; ordinary product analysis still works. */ }
    })();
    return () => controller.abort();
  }, [product?.code, market.code]);
  const p = product;
  const nova = novaInfo(p?.nova ?? null);
  const alternativesSupported = p !== null && comparableCategory(p) !== null;
  // The heading, cards and raw-data disclosure share the same presentation model.
  const additives = productAdditiveEvidence(p ?? {ingredients:undefined,additives:[]});
  const dataStatus = p ? productDataStatus(p) : null;
  const titles: Record<Exclude<Topic, null>, string> = { nova: 'Hva betyr NOVA?', nutriscore:'Hva betyr Nutri-Score?', ingredients: 'Om ingredienslisten', nutrition: 'Slik leser du næringsinnhold', additives: 'Om tilsetningsstoffer' };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.toolbar}><Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton}><Text style={styles.back}>← Tilbake til søk</Text></Pressable></View>
    <ScrollView contentContainerStyle={styles.page}>
      {loading && <ActivityIndicator color={colors.green} size="large" />}
      {!!error && <View style={styles.details}><Text accessibilityRole="alert" style={styles.body}>{error}</Text><Pressable onPress={() => setRetry(x => x + 1)} style={styles.infoButton}><Text style={styles.info}>Prøv igjen</Text></Pressable></View>}
      {p && <>
        <View style={styles.productHeader}>
          {p.image && !imageLoadFailed
            ? <Image source={{ uri: p.image }} style={styles.photo} resizeMode="contain" onError={() => setImageLoadFailed(true)} />
            : <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>{p.image ? 'Kunne ikke laste bildet' : 'Bilde ikke registrert'}</Text>
              </View>}
          <View style={styles.meta}><Text style={styles.brand}>{p.brand}</Text><Text accessibilityRole="header" style={styles.title}>{p.name}</Text>{!!p.quantity && <Text style={styles.caption}>{p.quantity}</Text>}</View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Bearbeidingsgrad. ' + (p.nova ? 'NOVA ' + p.nova : 'Ikke oppgitt') + '. Trykk for forklaring.'}
          onPress={() => setTopic('nova')} style={[styles.novaCard, { backgroundColor: nova.background, borderColor: nova.accent }]}>
          <View style={styles.spread}><Text style={[styles.novaCaption, { color: nova.foreground }]}>BEARBEIDINGSGRAD</Text><Text style={{ color: nova.foreground }}>ⓘ</Text></View>
          <Text style={[styles.novaTitle, { color: nova.foreground }]}>{p.nova ? 'NOVA ' + p.nova + ' · ' + nova.label : 'Bearbeidingsgrad ikke oppgitt'}</Text>
          <Text style={[styles.caption, { color: nova.foreground }]}>{p.nova ? 'Trykk for forklaring. Fargen viser bearbeiding, ikke en helsescore.' : 'Vi gjetter ikke ut fra produktnavnet. Trykk for å lese om NOVA.'}</Text>
        </Pressable>
        <Pressable testID="nutriscore-info" accessibilityRole="button"
          accessibilityLabel={'Nutri-Score, ernæringsprofil: '+nutriScoreLabel(p.nutriScore)+'. Trykk for forklaring.'}
          onPress={()=>setTopic('nutriscore')} style={styles.nutriRow}>
          <View style={{flex:1,gap:2}}><Text style={styles.nutriHeading}>Nutri-Score · næringsprofil</Text>
            <Text style={styles.caption}>Et supplement til NOVA, ikke en bearbeidingsgrad.</Text>
          </View>
          <Text style={styles.nutriValue}>{nutriScoreLabel(p.nutriScore)} ⓘ</Text>
        </Pressable>
        <View style={styles.sectionHeader}><Text style={styles.section}>Makroer</Text><Pressable accessibilityRole="button" accessibilityLabel="Forklaring av næringsinnhold" onPress={() => setTopic('nutrition')} style={styles.infoButton}><Text style={styles.info}>Hva betyr tallene? ⓘ</Text></Pressable></View>
        <Text style={styles.caption}>Per 100 g / 100 ml, slik datakilden oppgir verdiene.</Text>
        <View style={styles.macros}>{([['Protein', p.protein], ['Fett', p.fat], ['Karbohydrat', p.carbs]] as const).map(([label, value]) => <View key={label} style={styles.macro}><Text style={styles.caption}>{label}</Text><Text style={styles.macroValue}>{value === null ? '—' : amount(value)}</Text></View>)}</View>
        <Text style={styles.energyHeading}>Energifordeling (E%)</Text>
        <MacroEnergyRing protein={p.protein} carbs={p.carbs} fat={p.fat}/>
        <Text style={styles.caption}>Andel av beregnet energi fra protein, karbohydrater og fett. Fiber og andre energikilder inngår ikke.</Text>
        {[p.protein, p.fat, p.carbs].some(x => x === null) && <Text style={styles.caption}>— betyr at opplysningen mangler, ikke at mengden er null.</Text>}
        <View testID="product-snapshot" style={styles.snapshot}>
          <Text style={styles.snapshotHeading}>Kort fortalt</Text>
          {productSnapshot(p,additives.items.length,additives.unrecognized.length).map((fact,index)=><Text key={index} style={styles.body}>{fact}</Text>)}
          {!!dataStatus?.summaryNotice && <Text testID="product-data-caveat" style={styles.caption}>{dataStatus.summaryNotice}</Text>}
          <Text style={styles.caption}>Dette er registrerte kildeopplysninger, ikke en samlet helsevurdering.</Text>
        </View>
        {discovery && <View testID="worth-comparing" style={styles.discovery}>
          <Text style={styles.discoveryHeading}>Verdt å sammenligne</Text>
          <Text style={styles.body}>{discovery.name} er registrert med NOVA {discovery.nova}, mot NOVA {p.nova} for denne varen.</Text>
          <Text style={styles.caption}>Et relevant produkt med lavere registrert bearbeidingsgrad. Ikke nødvendigvis sunnere. Opplysningene kan være feil.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={'Sammenlign med '+discovery.name}
            onPress={() => router.push({ pathname: '/compare', params: { left: p.code, right: discovery.code } })} style={styles.compareButton}>
            <Text style={styles.compareText}>Se forskjellene →</Text>
          </Pressable>
        </View>}
        <View style={styles.accordions}>
          <Accordion key={p.code + '-ingredients'} title="Ingredienser">
            <Text style={styles.caption}>{['no', 'nb'].includes(p.ingredientLanguage) ? 'Tekst registrert i norsk språkfelt.' : 'Tekst fra datakilden. Kan inneholde flere språk; ikke automatisk oversatt.'}</Text>
            <Text style={styles.body} numberOfLines={fullIngredients ? undefined : 5}>{displayIngredientText(p.ingredients) || 'Ingredienslisten er ikke oppgitt.'}</Text>
            {ingredientTerms(p.ingredients).map(term => <Pressable key={term.id} testID={'ingredient-term-'+term.id} accessibilityRole="button" onPress={() => setSelectedTerm(term)} style={styles.infoButton}><Text style={styles.info}>Hva betyr «{term.name}»? ⓘ</Text></Pressable>)}
            {!!p.ingredients && <Pressable accessibilityRole="button" accessibilityState={{ expanded: fullIngredients }} onPress={() => setFullIngredients(!fullIngredients)} style={styles.infoButton}><Text style={styles.info}>{fullIngredients ? 'Vis mindre' : 'Vis hele teksten'}</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={() => setTopic('ingredients')} style={styles.infoButton}><Text style={styles.info}>Om ingredienslisten ⓘ</Text></Pressable>
          </Accordion>
          <Accordion key={p.code + '-nutrition'} title="Alt næringsinnhold">
            <Text style={styles.caption}>Per 100 g / 100 ml. Ingen porsjoner er beregnet.</Text>
            {([['Energi', p.energy, 'kcal'], ['Protein', p.protein, 'g'], ['Fett', p.fat, 'g'], ['Karbohydrat', p.carbs, 'g'], ['Hvorav sukkerarter', p.sugar, 'g'], ['Fiber', p.fiber, 'g'], ['Salt', p.salt, 'g']] as const).map(([label, value, unit]) => <View key={label} style={styles.nutrientRow}><Text style={styles.body}>{label}</Text><Text style={styles.nutrientValue}>{unit==='kcal'&&p.energyConvertedFromKJ&&value!==null?'ca. '+amount(value,unit):amount(value,unit)}</Text></View>)}
          </Accordion>
          <Accordion key={p.code + '-additives'} title={additives.title}>
            {additives.items.length === 0 && additives.unrecognized.length===0 && <Text testID="missing-e-codes" style={styles.body}>Ingen eksplisitte E-numre registrert i ingredienslisten eller Open Food Facts sitt E-kodefelt. Kontroller emballasjen. Manglende oppføring betyr ikke at varen er fri for tilsetningsstoffer.</Text>}
            {!!additives.groupingNote && <Text style={styles.caption}>{additives.groupingNote}</Text>}
            {additives.items.map(a => <Pressable key={a.code} testID={'product-additive-'+a.code} accessibilityRole="button" accessibilityLabel={'Les om ' + formatAdditiveCode(a.code) + ', ' + a.info.name} onPress={() => setSelectedAdditive(a.info)} style={styles.additiveRow}>
              <View style={{ flex: 1, gap: 3 }}><Text style={styles.additiveName}>{formatAdditiveCode(a.code)} · {a.info.name}</Text>
                <Text style={styles.caption}>{a.info.role}</Text>
                <Text style={styles.caption}>{additiveEvidenceLabel(a.evidence)}</Text>
              </View><Text style={styles.arrow}>ⓘ</Text>
            </Pressable>)}
            {additives.unrecognized.map(raw => <View key={raw} style={styles.additiveRow}>
              <View style={{ flex: 1, gap: 3 }}><Text style={styles.additiveName}>{raw}</Text><Text style={styles.caption}>Ukjent kodeformat fra datakilden. Oppføringen er beholdt, men ikke tolket.</Text></View>
            </View>)}
            {!!ingredientCodeNote(p.ingredients,p.additives) && <Text style={styles.warning}>{ingredientCodeNote(p.ingredients,p.additives)}</Text>}
            <Text style={styles.caption}>Bare eksplisitt oppførte E-numre telles, fra ingredienslisten og/eller E-kodefeltet. Det er ikke en fullstendig kartlegging av innholdet. Originalkodene er tilgjengelige under «Kilde og datakvalitet».</Text>
            <Pressable accessibilityRole="button" onPress={() => setTopic('additives')} style={styles.infoButton}><Text style={styles.info}>Hva betyr E-numrene? ⓘ</Text></Pressable>
          </Accordion>
          <Accordion key={p.code + '-allergens'} title="Allergenopplysninger">
            <Text testID="allergen-display" style={styles.body}>{p.allergens.length ? formatAllergenTags(p.allergens).join(', ') : 'Allergenopplysninger er ikke registrert.'}</Text>
            {!!p.allergens.length && <Text style={styles.caption}>Navnene er forenklet fra kildens oppføringer; se originalkodene under «Kilde og datakvalitet».</Text>}
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
              {alternativesRequested && !alternativesLoading && !alternativesError && alternatives.length === 0 && <Text style={styles.caption}>Ingen relevante alternativer funnet i søkeindeksen. Nyere produkter kan mangle – prøv å velge en vare selv.</Text>}
              {!alternativesLoading && !alternativesError && alternatives.map(other => <View key={other.code} style={styles.altRow}>
                {other.image && !failedAlternativeImages.includes(other.code)
                  ? <Image source={{ uri: other.image }} style={styles.altImage} resizeMode="contain"
                      onError={() => setFailedAlternativeImages(current => current.includes(other.code) ? current : [...current, other.code])}/>
                  : <View style={styles.altImageFallback} accessibilityLabel="Produktbilde mangler">
                      <Text style={styles.altImageEmoji}>{fallbackProductIcon(other)}</Text>
                    </View>}
                <View style={{ flex: 1, gap: 6 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={'Se ' + other.name} onPress={() => router.push({ pathname: '/product/[id]', params: { id: other.code } })}>
                    <Text style={styles.additiveName}>{other.name}</Text><Text style={styles.caption}>{other.brand}</Text>
                  </Pressable>
                  <Text style={styles.caption}>Protein {amount(other.protein)} · Fett {amount(other.fat)} · Karbohydrat {amount(other.carbs)}</Text>
                  <Text style={styles.caption}>NOVA hentes på nytt ved sammenligning</Text>
                  {!!candidateNote(p, other) && <Text style={styles.candidateNote}>{candidateNote(p, other)}</Text>}
                  <Pressable accessibilityRole="button" accessibilityLabel={'Sammenlign ' + p.name + ' med ' + other.name}
                    onPress={() => router.push({ pathname: '/compare', params: { left: p.code, right: other.code } })} style={styles.compareButton}>
                    <Text style={styles.compareText}>Sammenlign med denne →</Text>
                  </Pressable>
                </View>
              </View>)}
              {alternativesRequested && !alternativesLoading && !alternativesError && alternatives.length > 0 && <Text style={styles.caption}>Treffene kommer fra søkeindeksen og kan ha eldre eller mangelfulle NOVA- og næringstall. Sammenligningen henter oppdaterte produktdata. Forslagene er ikke en sunnhetsrangering.</Text>}
            </> : <Text testID="alternatives-unavailable" style={styles.caption}>Alternativsøk støttes ikke for denne produktkategorien ennå.</Text>}
            <Pressable accessibilityRole="button" testID="manual-compare"
              onPress={() => router.push({ pathname: '/compare', params: { left: p.code } })} style={styles.manualCompare}>
              <Text style={styles.compareText}>Velg en annen matvare selv →</Text>
            </Pressable>
          </View>
          <Accordion key={p.code + '-source'} title="Kilde og datakvalitet">
            <Text style={styles.body}>Dataene kommer fra Open Food Facts og kan være feil eller ufullstendige.</Text>
            <Text testID="product-data-status" style={styles.caption}>{dataStatus?.headline}</Text>
            {dataStatus?.notes.map(note => <Text key={note} style={styles.caption}>• {note}</Text>)}
            <Text style={styles.body}>{market.tag === null ? 'Du søker i alle land.' : p.countries.includes(market.tag) ? 'Registrert for ' + market.name + '. Dette er ikke en lagerstatus.' : 'Ikke registrert for ' + market.name + ' i dataene vi har. Varen kan likevel finnes der.'}</Text>
            <Text style={styles.caption}>Strekkode: {p.code}</Text>
            {!!additives.rawTags.length && <Text selectable style={styles.caption}>Originale tilsetningsstoffkoder: {additives.rawTags.join(', ')}</Text>}
            {!!p.allergens.length && <Text selectable testID="allergens-raw" style={styles.caption}>Originale allergenoppføringer: {p.allergens.join(', ')}</Text>}
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
      {!!selectedAdditive?.background && <><Text style={styles.modalHeading}>Bakgrunn og bruk</Text><Text style={styles.body}>{selectedAdditive.background}</Text></>}
      {!!selectedAdditive?.healthContext && <><Text style={styles.modalHeading}>Hva vet vi?</Text><Text style={styles.body}>{selectedAdditive.healthContext}</Text></>}
      <Text style={styles.caption}>Funksjon: {selectedAdditive?.role}. Hvilken mengde som er brukt i akkurat denne varen er ikke kjent. Dette er ikke en individuell helserisikovurdering.</Text>
      {!!selectedAdditive && <SourceLink label={additiveSourceLabel(selectedAdditive.source)} url={selectedAdditive.source} />}
      {!!selectedAdditive?.healthSource && <SourceLink label={additiveSourceLabel(selectedAdditive.healthSource)} url={selectedAdditive.healthSource} />}
    </InfoSheet>
    <InfoSheet visible={selectedTerm !== null} title={selectedTerm?.name ?? ''} onClose={() => setSelectedTerm(null)}>
      <Text style={styles.modalHeading}>{selectedTerm?.category}</Text>
      <Text style={styles.body}>{selectedTerm?.description}</Text>
      <Text style={styles.caption}>Forklaring av et ord i ingredienslisten, ikke en vurdering av dette produktets helsefare eller bearbeidingsgrad.</Text>
      {!!selectedTerm && <SourceLink label={selectedTerm.id === 'aroma' ? 'Mattilsynet – aroma og merking' : 'Mattilsynet – tilsetningsstoffenes funksjon'} url={selectedTerm.source} />}
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
      {topic === 'nutriscore' && <>
        <Text style={styles.body}>{nutriScoreDescription(p?.nutriScore ?? null)}</Text>
        <Text style={styles.body}>Nutri-Score bruker bokstavene A–E for å oppsummere ernæringsprofilen. NOVA grupperer mat etter bearbeidingsgrad. De er forskjellige vurderinger og kan gi ulike inntrykk av samme matvare.</Text>
        <Text style={styles.caption}>Nutri-Score har fått en oppdatert beregningsmetode som tas i bruk gradvis. Matkontroll viser bare karakteren som er registrert i Open Food Facts. I Norge er Nøkkelhullet en egen nordisk merkeordning.</Text>
        <SourceLink label="Om Nutri-Score (Santé publique France)" url={NUTRI_SCORE_SOURCE}/>
        <SourceLink label="Om Nøkkelhullet (Helsedirektoratet)" url={NORWEGIAN_LABEL_SOURCE}/>
      </>}
      {topic === 'nutrition' && <><Text style={styles.body}>Protein, fett og karbohydrat vises separat. Sukkerarter er en del av karbohydratene, ikke noe du skal legge til en gang til.</Text><Text style={styles.body}>Sukkerarter inkluderer naturlig forekommende sukker. Tallet forteller ikke alene hvor mye som er tilsatt. Sammenlign samme type vare og samme målegrunnlag.</Text><Text style={styles.caption}>Målegrunnlaget er ikke alltid entydig i API-et. Derfor viser vi ikke beregnede porsjoner eller automatiske rangeringer ennå.</Text></>}
      {topic === 'ingredients' && <><Text style={styles.body}>Dette er teksten datakilden har registrert, ikke en oppskrift vi har utledet. Vi rydder bare i tegnkoder og skjuler understreker brukt som formateringsmarkeringer. Ingen ingrediensnavn oversettes eller fjernes.</Text><Text style={styles.body}>Feilregistrerte lister kan inneholde flere språk eller næringsdeklarasjon. Vi kutter ikke bort innhold automatisk, siden viktige opplysninger kan gå tapt.</Text></>}
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
  photo: { width: 80, height: 100, borderRadius: 14, backgroundColor: '#E9EFE9' },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', padding: 6 },
  photoPlaceholderText: { color: colors.muted, fontSize: 10, textAlign: 'center', lineHeight: 14 },
  meta: { flex: 1, gap: 5 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink }, brand: { fontSize: 14, color: colors.muted },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink }, caption: { fontSize: 12, lineHeight: 19, color: colors.muted },
  novaCard: { borderWidth: 1, padding: 18, borderRadius: 18, gap: 9 }, spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  novaCaption: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }, novaTitle: { fontSize: 21, fontWeight: '800' },
  nutriRow: { borderWidth:1,borderColor:colors.line,borderRadius:13,paddingHorizontal:14,paddingVertical:10,
    minHeight:60,backgroundColor:'white',flexDirection:'row',alignItems:'center',gap:12 },
  nutriHeading: {fontSize:14,fontWeight:'700',color:colors.ink},
  nutriValue: {fontSize:16,fontWeight:'800',color:colors.green},
  snapshot: {gap:6,padding:14,backgroundColor:'#EDF3ED',borderRadius:14},
  discovery: { gap: 7, borderWidth: 1, borderColor: colors.line, padding: 14, borderRadius: 14, backgroundColor: 'white' },
  discoveryHeading: { fontSize: 15, fontWeight: '700', color: colors.ink },
  snapshotHeading: {fontSize:16,fontWeight:'800',color:colors.ink},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }, section: { fontSize: 18, fontWeight: '800', color: colors.ink },
  infoButton: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 }, info: { fontSize: 13, fontWeight: '700', color: colors.green },
  macros: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' }, macro: { flex: 1, minWidth: 85, padding: 12, gap: 7, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  energyHeading:{fontSize:15,fontWeight:'700',color:colors.ink},
  energyRow:{flexDirection:'row',alignItems:'center',gap:14,flexWrap:'wrap'},
  energyRing:{width:128,height:128,justifyContent:'center',alignItems:'center'},
  energyCenter:{alignItems:'center',gap:1},energyCenterMain:{fontSize:20,fontWeight:'800',color:colors.ink},
  energyCenterSmall:{fontSize:9,color:colors.muted},
  energyLegend:{flex:1,minWidth:150,gap:12},
  energyLegendRow:{flexDirection:'row',alignItems:'center',gap:7},
  energyDot:{width:9,height:9,borderRadius:5},
  energyLegendLabel:{flex:1,fontSize:12,color:colors.ink},
  energyLegendPct:{fontSize:14,fontWeight:'700',color:colors.ink},
  macroValue: { fontSize: 18, fontWeight: '700', color: colors.ink }, accordions: { marginTop: 2 }, accordion: { borderTopWidth: 1, borderTopColor: colors.line },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17 }, accordionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  arrow: { fontSize: 24, color: colors.green }, details: { paddingBottom: 17, gap: 12 }, nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  nutrientValue: { fontSize: 15, lineHeight: 23, color: colors.ink, fontWeight: '600' }, warning: { fontSize: 13, lineHeight: 21, color: '#825617' },
  additiveRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: 'white' },
  additiveName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  modalHeading: { fontSize: 16, fontWeight: '800', color: colors.ink },
  alternatives: { gap: 10, paddingVertical: 17, borderTopWidth: 1, borderTopColor: colors.line },
  alternativesTitle: { fontSize: 16, fontWeight: '700', color: colors.ink }, altButtonDisabled: { opacity: 0.5 },
  altButton: { minHeight: 44, borderWidth: 1, borderColor: colors.green, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, alignItems: 'center', alignSelf: 'flex-start' },
  altButtonText: { fontSize: 14, fontWeight: '700', color: colors.green },
  altRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: 'white' },
  compareButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 7 },
  manualCompare: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingVertical: 7 },
  compareText: { fontSize: 14, color: colors.green, fontWeight: '700' },
  altImage: { width: 58, height: 70, backgroundColor: '#EBF1EB', borderRadius: 9 },
  altImageFallback: { width: 58, height: 70, backgroundColor: '#EBF1EB', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  altImageEmoji: { fontSize: 24 },
  candidateNote: { color: '#80551C', fontSize: 12, lineHeight: 18 },
  novaExplanation: { padding: 13, borderRadius: 12, gap: 4 }, explanationTitle: { fontSize: 15, fontWeight: '800' },
});
