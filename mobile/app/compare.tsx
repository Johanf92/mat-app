import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FoodProduct, getProduct, searchProducts } from '../src/openFoodFacts';
import { useMarket } from '../src/MarketContext';
import { type CompareFocus, COMPARE_OPTIONS, METRICS, comparisonInsight, metricAmount, comparisonDataWarnings, keyDifferences, additiveEvidenceRows, additiveEvidenceLabel, quickComparisonFacts } from '../src/comparison';
import { productProfile, candidateNote, relatedVariantComparisonNote } from '../src/alternatives';
import { additiveInfo, additiveSourceLabel, formatAdditiveCode, summarizeAdditives, type AdditiveInfo } from '../src/additives';
import { displayIngredientText } from '../src/ingredientEvidence';
import { ingredientMentionDifferences, ingredientComparisonInsight } from '../src/ingredientComparison';
import { productDataStatus } from '../src/productDataStatus';
import { nutriScoreLabel } from '../src/nutriScore';
import { colors, InfoSheet, NovaBadge, SourceLink } from '../src/ui';

type DetailId = 'focus' | 'nutrition' | 'ingredients' | 'additives' | 'sources';

function DetailSection({id,title,open,onToggle,children}:PropsWithChildren<{
 id:DetailId; title:string; open:boolean; onToggle:()=>void;
}>) {
 return <View testID={'detail-section-'+id} style={s.detailSection}>
   <Pressable testID={'toggle-detail-'+id} accessibilityRole="button"
     accessibilityLabel={title} accessibilityHint="Viser eller skjuler detaljene på denne siden."
     accessibilityState={{expanded:open}} onPress={onToggle} style={s.detailHeader}>
     <Text style={s.detailTitle}>{title}</Text><Text style={s.detailArrow}>{open?'−':'+'}</Text>
   </Pressable>
   {open && <View testID={'detail-content-'+id} style={s.detailContent}>{children}</View>}
 </View>;
}

export default function Compare() {
 const router=useRouter();
 const params=useLocalSearchParams<{left?:string;right?:string}>();
 const leftCode=Array.isArray(params.left)?params.left[0]:params.left;
 const rightCode=Array.isArray(params.right)?params.right[0]:params.right;
 const {market}=useMarket();
 const [left,setLeft]=useState<FoodProduct|null>(null);
 const [right,setRight]=useState<FoodProduct|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<FoodProduct[]>([]);
 const [searching,setSearching]=useState(false);
 const [searched,setSearched]=useState(false);
 const [searchError,setSearchError]=useState('');
 const [focus,setFocus]=useState<CompareFocus>('processing');
 const [showIngredients,setShowIngredients]=useState(false);
 const [expandedFact,setExpandedFact]=useState<string|null>(null);
 const [detailOpen,setDetailOpen]=useState<DetailId|null>(null);
 const [selectedAdditive,setSelectedAdditive]=useState<AdditiveInfo|null>(null);
 const [failedImageCodes,setFailedImageCodes]=useState<string[]>([]);
 const searchController=useRef<AbortController|null>(null);
 useEffect(()=>{
   const controller=new AbortController();
   setError('');setLoading(true);setLeft(null);setRight(null);
   setExpandedFact(null);setDetailOpen(null);setShowIngredients(false);setFailedImageCodes([]);
   if(!leftCode){setError('Velg et produkt før du sammenligner.');setLoading(false);return ()=>controller.abort();}
   Promise.all([getProduct(leftCode,controller.signal),rightCode?getProduct(rightCode,controller.signal):Promise.resolve(null)])
    .then(([a,b])=>{if(controller.signal.aborted)return;setLeft(a);setRight(b);
     if(!a)setError('Fant ikke det første produktet.');
     else if(rightCode&&!b)setError('Fant ikke produktet som skal sammenlignes.');
    }).catch(()=>{if(!controller.signal.aborted)setError('Kunne ikke hente produktdata. Prøv igjen.');})
    .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return ()=>controller.abort();
 },[leftCode,rightCode]);
 useEffect(()=>()=>searchController.current?.abort(),[]);
 async function searchSecond() {
   const q=query.trim();if(q.length<2||searching)return;
   searchController.current?.abort();
   const controller=new AbortController();searchController.current=controller;
   setSearching(true);setSearched(true);setSearchError('');setResults([]);Keyboard.dismiss();
   try{
     const barcode=q.replace(/\s/g,'');
     const data=/^\d{8,14}$/.test(barcode)?[await getProduct(barcode,controller.signal)].filter((x):x is FoodProduct=>x!==null):await searchProducts(q,market,controller.signal);
     if(!controller.signal.aborted)setResults(data.filter(p=>p.code!==leftCode));
   }catch{if(!controller.signal.aborted)setSearchError('Kunne ikke søke akkurat nå. Prøv igjen.');}
   finally{if(!controller.signal.aborted)setSearching(false);}
 }
 function choose(p:FoodProduct) {
   searchController.current?.abort();setResults([]);setSearched(false);setQuery('');setShowIngredients(false);
   router.setParams({right:p.code});
 }
 const sameType=left&&right&&productProfile(left)?.kind===productProfile(right)?.kind&&productProfile(left)!==null;
 const relatedVariantNote=left&&right?relatedVariantComparisonNote(left,right):null;
 const variantWarning=left&&right?candidateNote(left,right):null;
 const notices=left&&right?comparisonDataWarnings(left,right):[];
 const evidenceRows=left&&right?additiveEvidenceRows(left,right):[];
 const quickFacts=left&&right?quickComparisonFacts(left,right):[];
 const toggleDetail=(id:DetailId)=>setDetailOpen(current=>current===id?null:id);
 return <SafeAreaView style={s.safe} edges={['top','bottom','left','right']}>
  <View style={s.toolbar}><Pressable accessibilityRole="button" onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={s.backButton}><Text style={s.back}>← Tilbake</Text></Pressable></View>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <Text accessibilityRole="header" style={s.title}>Sammenlign matvarer</Text>

    {loading&&<ActivityIndicator color={colors.green} size="large"/>}
    {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
    {left&&!rightCode&&!loading&&<View style={s.pick}>
      <Text style={s.section}>Velg produkt nummer to</Text>
      <Text style={s.note}>Sammenlignes med: {left.name} ({left.brand})</Text>
      <TextInput style={s.input} accessibilityLabel="Søk etter produkt eller strekkode" placeholder="Søk produkt, merke eller strekkode" value={query}
        onChangeText={v=>{setQuery(v);setResults([]);setSearched(false);setSearchError('');}}
        onSubmitEditing={()=>{void searchSecond();}} returnKeyType="search" autoCorrect={false}/>
      <Pressable accessibilityRole="button" style={[s.button,(searching||query.trim().length<2)&&s.disabled]} disabled={searching||query.trim().length<2} onPress={()=>{void searchSecond();}}><Text style={s.buttonText}>Søk i {market.name}</Text></Pressable>
      {searching&&<ActivityIndicator color={colors.green}/>}
      {!!searchError&&<Text style={s.warning}>{searchError}</Text>}
      {searched&&!searching&&!searchError&&!results.length&&<Text style={s.note}>Ingen treff. Prøv et annet søkeord eller land.</Text>}
      {results.map(p=><Pressable key={p.code} accessibilityRole="button" onPress={()=>choose(p)} style={s.result}>
        {p.image&&!failedImageCodes.includes(p.code)
         ?<Image source={{uri:p.image}} style={s.resultImage} resizeMode="contain"
            onError={()=>setFailedImageCodes(codes=>codes.includes(p.code)?codes:[...codes,p.code])}/>
         :<View style={[s.resultImage,s.resultImageFallback]}><Text style={s.resultImageFallbackText}>{p.image?'Bilde utilgjengelig':'Uten bilde'}</Text></View>}
        <View style={{flex:1,gap:4}}><Text style={s.resultName}>{p.name}</Text><Text style={s.note}>{p.brand}</Text><NovaBadge group={p.nova} compact/></View>
        <Text style={s.arrow}>›</Text>
      </Pressable>)}
      <Text style={s.note}>Tekstsøk filtreres etter valgt land. Strekkoder slås opp globalt. Registrering betyr ikke at varen finnes i butikk.</Text>
    </View>}
    {left&&right&&!loading&&<>
      <View style={s.productGrid}>
       {[left,right].map((p,index)=><View key={p.code} style={s.productCard}>
        {p.image&&!failedImageCodes.includes(p.code)
          ?<Image source={{uri:p.image}} style={s.productImage} resizeMode="contain"
            onError={()=>setFailedImageCodes(codes=>codes.includes(p.code)?codes:[...codes,p.code])}/>
          :<View style={[s.productImage,s.productImagePlaceholder]}>
            <Text style={s.productImagePlaceholderText}>{p.image?'Kunne ikke laste bildet':'Bilde ikke registrert'}</Text>
          </View>}
        <Text style={s.columnCaption}>PRODUKT {index===0?'A':'B'}</Text>
        <Text numberOfLines={3} style={s.productName}>{p.name}</Text><Text numberOfLines={2} style={s.note}>{p.brand}</Text>
        <NovaBadge group={p.nova} compact/>
        <Text style={s.note}>Nutri-Score: {nutriScoreLabel(p.nutriScore)}</Text>
       </View>)}
      </View>

      <Pressable accessibilityRole="button" style={s.change} onPress={()=>{setRight(null);router.setParams({right:''});}}><Text style={s.changeText}>Endre produkt B →</Text></Pressable>
      {!sameType&&!relatedVariantNote&&<Text style={s.warning}>Disse varene er ikke bekreftet som samme produkttype. Sammenligningen kan derfor være mindre relevant.</Text>}

      {!!relatedVariantNote&&<Text testID="related-variant-note" style={s.note}>{relatedVariantNote}</Text>}
      {!!variantWarning&&<Text style={s.warning}>{variantWarning}</Text>}

      <View testID="comparison-overview" style={s.quickPanel}>
        <Text accessibilityRole="header" style={s.quickTitle}>Kort oppsummert</Text>

        {quickFacts.map((fact,index)=><View key={fact.key} style={[s.quickRow,index>0&&s.quickDivider]}>
          <Pressable testID={'quick-fact-'+fact.key} accessibilityRole="button"
            accessibilityLabel={fact.label+'. '+fact.summary} accessibilityState={{expanded:expandedFact===fact.key}}
            onPress={()=>setExpandedFact(current=>current===fact.key?null:fact.key)} style={s.quickTrigger}>
            <View style={s.quickText}>
              <Text style={s.quickLabel}>{fact.label}</Text>
              <Text style={s.quickSummary}>{fact.summary}</Text>
            </View>
            <Text style={s.quickArrow}>{expandedFact===fact.key?'−':'+'}</Text>
          </Pressable>
          {expandedFact===fact.key&&<View testID={'quick-detail-'+fact.key} style={s.quickExplanation}>
            <Text style={s.body}>{fact.detail}</Text>
          </View>}
        </View>)}

      </View>
      <View testID="comparison-key-nutrients" style={s.nutrientPreview}>
        <Text style={s.previewHeading}>Næringsinnhold · per 100 g / 100 ml</Text>
        <View style={s.tableHeader}><Text style={s.metricLabel}> </Text><Text style={s.metricValue}>A</Text><Text style={s.metricValue}>B</Text></View>
        {METRICS.filter(m=>['sugar','protein','salt'].includes(m.key)).map(m=><View key={m.key} style={s.tableRow}>
          <Text style={s.metricLabel}>{m.label}</Text>
          <Text style={s.metricValue}>{metricAmount(left,m.key,m.unit)}</Text>
          <Text style={s.metricValue}>{metricAmount(right,m.key,m.unit)}</Text>
        </View>)}
      </View>
      {notices.length>0&&<View style={s.qualityCard}>
        <Text style={s.qualityHeading}>Verdt å kontrollere</Text>
        {notices.map((note,i)=><Text key={i} style={s.warning}>{note}</Text>)}
      </View>}
      <Text accessibilityRole="header" style={s.section}>Mer informasjon</Text>

      <View style={s.disclosures}>
        <DetailSection id="focus" title="Forklar tallene" open={detailOpen==='focus'} onToggle={()=>toggleDetail('focus')}>
          <Text style={s.note}>Velg det du vil se nærmere på:</Text>
          <View style={s.options}>
            {COMPARE_OPTIONS.map(o=><Pressable key={o.key} accessibilityRole="button"
              accessibilityState={{selected:focus===o.key}} style={[s.option,focus===o.key&&s.optionSelected]}
              onPress={()=>setFocus(o.key)}>
              <Text style={[s.optionText,focus===o.key&&s.optionTextSelected]}>{o.label}</Text>
            </Pressable>)}
          </View>
          <View style={s.insight}>
            <Text style={s.insightTitle}>Dette viser dataene</Text>
            <Text style={s.body}>{comparisonInsight(left,right,focus)}</Text>
          </View>
          <Text style={s.detailSubheading}>Andre observasjoner</Text>
          {keyDifferences(left,right).map(entry=><View key={entry.key} style={s.additionalDifference}>
            <Text style={s.differenceLabel}>{entry.label}</Text>
            <Text style={s.body}>{entry.description}</Text>
          </View>)}
        </DetailSection>
        <DetailSection id="nutrition" title="Hele næringstabellen" open={detailOpen==='nutrition'} onToggle={()=>toggleDetail('nutrition')}>
          <Text style={s.note}>Per 100 g / 100 ml, slik kilden oppgir det. Manglende verdier betyr ikke null.</Text>
          <View style={s.tableHeader}>
            <Text style={s.metricLabel}>Egenskap</Text><Text style={s.metricValue}>A</Text><Text style={s.metricValue}>B</Text>
          </View>
          {METRICS.map(m=><View key={m.key} style={s.tableRow}>
            <Text style={s.metricLabel}>{m.label}</Text>
            <Text style={s.metricValue}>{metricAmount(left,m.key,m.unit)}</Text>
            <Text style={s.metricValue}>{metricAmount(right,m.key,m.unit)}</Text>
          </View>)}
        </DetailSection>
        <DetailSection id="ingredients" title="Ingredienslister" open={detailOpen==='ingredients'} onToggle={()=>toggleDetail('ingredients')}>
          {ingredientMentionDifferences(left,right).length>0 && <View testID="explicit-ingredient-differences" style={s.ingredients}>
            <Text style={s.resultName}>Eksplisitt nevnte ingrediensord</Text>
            {ingredientMentionDifferences(left,right).map(item=><Text key={item.key} style={s.body}>
              {item.label}: nevnt i tekst for {item.side}, ikke eksplisitt nevnt i den andre listen.
            </Text>)}
            <Text style={s.note}>Dette er ikke bevis på at stoffet mangler i den andre varen.</Text>
          </View>}
          {([['A',left],['B',right]] as const).map(([letter,p])=><View key={p.code+'ingredients'} style={s.ingredients}>
            <Text style={s.resultName}>Produkt {letter} · {p.name}</Text>
            <Text style={s.body} numberOfLines={showIngredients?undefined:5}>
              {displayIngredientText(p.ingredients)||'Ingredienslisten er ikke oppgitt.'}
            </Text>
          </View>)}
          <Pressable accessibilityRole="button" accessibilityState={{expanded:showIngredients}}
            onPress={()=>setShowIngredients(!showIngredients)} style={s.change}>
            <Text style={s.changeText}>{showIngredients?'Vis kortere lister':'Vis hele ingredienslistene'}</Text>
          </Pressable>
          <Text style={s.note}>Ulik ordlyd er ikke i seg selv bevis på ulik oppskrift. Kontroller emballasjen ved allergi.</Text>
        </DetailSection>
        <DetailSection id="additives" title="E-koder og dokumentasjon" open={detailOpen==='additives'} onToggle={()=>toggleDetail('additives')}>
          <Text style={s.note}>Kun eksplisitte E-koder fra ingredienslistene og databasens separate E-kodefelt. Trykk på en kode for forklaring.</Text>
          {evidenceRows.length===0&&<Text style={s.body}>Ingen E-koder er dokumentert i disse feltene. Dette bekrefter ikke at varene er uten tilsetningsstoffer.</Text>}
          {evidenceRows.map(row=><Pressable key={row.code} accessibilityRole="button"
            accessibilityLabel={'Les om '+row.displayCode} onPress={()=>setSelectedAdditive(additiveInfo(row.code))} style={s.additiveBox}>
            <Text style={s.resultName}>{row.displayCode} · {row.name}  ⓘ</Text>
            <Text style={s.note}>{row.role}</Text>
            <Text style={s.evidenceSource}>A · {additiveEvidenceLabel(row.aEvidence)}</Text>
            <Text style={s.evidenceSource}>B · {additiveEvidenceLabel(row.bEvidence)}</Text>
          </Pressable>)}
          {([['A',left],['B',right]] as const).map(([letter,p])=>{
            const raw=summarizeAdditives(p.additives).unrecognized;
            return raw.length>0?<Text key={'raw-'+letter} style={s.note}>Produkt {letter} har også koder med ukjent format: {raw.join(', ')}.</Text>:null;
          })}
          <Text style={s.note}>Manglende oppføring betyr ikke at stoffet er fraværende. E290 er karbondioksid; en ensidig registrering beviser ikke ulikt innhold av kullsyre.</Text>
        </DetailSection>
        <DetailSection id="sources" title="Kilder og datakvalitet" open={detailOpen==='sources'} onToggle={()=>toggleDetail('sources')}>
          <Text style={s.body}>Opplysningene kommer fra Open Food Facts og kan være feil eller ufullstendige.</Text>
          <Text style={s.note}>Produkt A · Strekkode {left.code}</Text>
          <Text testID="compare-data-status-A" style={s.note}>{productDataStatus(left).headline}</Text>
          {productDataStatus(left).notes.map(note=><Text key={'a-'+note} style={s.note}>• {note}</Text>)}
          <Text style={s.note}>Produkt B · Strekkode {right.code}</Text>
          <Text testID="compare-data-status-B" style={s.note}>{productDataStatus(right).headline}</Text>
          {productDataStatus(right).notes.map(note=><Text key={'b-'+note} style={s.note}>• {note}</Text>)}
          <SourceLink label="Kilde for produkt A (åpner nettleseren)" url={'https://world.openfoodfacts.org/product/'+left.code}/>
          <SourceLink label="Kilde for produkt B (åpner nettleseren)" url={'https://world.openfoodfacts.org/product/'+right.code}/>
        </DetailSection>
      </View>
      <Text style={s.warning}>Kontroller alltid emballasjen ved allergi. NOVA beskriver bearbeiding, ikke en samlet helsevurdering.</Text>
    </>}
  </ScrollView>
  <InfoSheet visible={selectedAdditive!==null}
    title={selectedAdditive?formatAdditiveCode(selectedAdditive.id)+' · '+selectedAdditive.name:''}
    onClose={()=>setSelectedAdditive(null)}>
    <Text style={s.body}>{selectedAdditive?.description}</Text>
    {!!selectedAdditive?.background&&<><Text style={s.modalHeading}>Bakgrunn og bruk</Text><Text style={s.body}>{selectedAdditive.background}</Text></>}
    {!!selectedAdditive?.healthContext&&<><Text style={s.modalHeading}>Hva vet vi?</Text><Text style={s.body}>{selectedAdditive.healthContext}</Text></>}
    <Text style={s.note}>Funksjonen beskriver stoffet generelt. Vi kjenner ikke mengden brukt i den aktuelle varen.</Text>
    {!!selectedAdditive&&<SourceLink label={additiveSourceLabel(selectedAdditive.source)} url={selectedAdditive.source}/>}
    {!!selectedAdditive?.healthSource&&<SourceLink label={additiveSourceLabel(selectedAdditive.healthSource)} url={selectedAdditive.healthSource}/>}
  </InfoSheet>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.page},toolbar:{paddingHorizontal:18,borderBottomWidth:1,borderBottomColor:colors.line},
 backButton:{minHeight:48,justifyContent:'center'},back:{fontSize:16,fontWeight:'700',color:colors.green},
 page:{padding:22,paddingBottom:55,gap:15},title:{fontSize:29,fontWeight:'800',color:colors.ink},
 note:{fontSize:12,lineHeight:19,color:colors.muted},body:{fontSize:15,lineHeight:23,color:colors.ink},modalHeading:{fontSize:16,fontWeight:'800',color:colors.ink},section:{fontSize:19,fontWeight:'800',color:colors.ink,marginTop:6},
 warning:{fontSize:13,lineHeight:21,color:'#80551C'},pick:{gap:13,backgroundColor:'#EFF5EF',padding:16,borderRadius:18},
 input:{fontSize:16,backgroundColor:'white',borderRadius:12,padding:14,borderWidth:1,borderColor:colors.line,color:colors.ink},
 button:{backgroundColor:colors.green,borderRadius:12,padding:15,alignItems:'center',minHeight:48},buttonText:{color:'white',fontSize:15,fontWeight:'700'},
 disabled:{opacity:0.5},result:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'white',borderRadius:13,borderColor:colors.line,borderWidth:1,padding:12},
 resultImage:{width:54,height:62,borderRadius:8,backgroundColor:'#E9EEE9'},resultImageFallback:{justifyContent:'center',alignItems:'center'},resultImageFallbackText:{fontSize:10,color:colors.muted,textAlign:'center',padding:3},resultName:{fontSize:15,fontWeight:'700',color:colors.ink},arrow:{color:colors.green,fontSize:25},
 productGrid:{flexDirection:'row',gap:12},productCard:{flex:1,backgroundColor:'white',borderColor:colors.line,borderWidth:1,borderRadius:16,padding:12,gap:8,minWidth:0},
 productImage:{width:'100%',height:95,borderRadius:10,backgroundColor:'#EDF2ED'},productImagePlaceholder:{justifyContent:'center',alignItems:'center',padding:8},productImagePlaceholderText:{fontSize:11,color:colors.muted,textAlign:'center'},columnCaption:{fontSize:11,letterSpacing:0.6,color:colors.muted,fontWeight:'800'},
 productName:{fontSize:16,fontWeight:'800',color:colors.ink,minHeight:35},change:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 changeText:{color:colors.green,fontSize:14,fontWeight:'700'},options:{flexDirection:'row',flexWrap:'wrap',gap:9},option:{flexBasis:'46%',flexGrow:1,minHeight:44,justifyContent:'center',alignItems:'center',borderColor:colors.line,borderWidth:1,borderRadius:20,paddingHorizontal:10,paddingVertical:10,backgroundColor:'white'},
 optionSelected:{borderColor:colors.green,backgroundColor:'#E2F0E5'},optionText:{fontSize:13,fontWeight:'600',color:colors.muted},optionTextSelected:{color:colors.green},
 insight:{backgroundColor:'#E5F1E7',borderRadius:16,padding:17,gap:9},insightTitle:{fontSize:16,fontWeight:'800',color:colors.ink},
 differences:{backgroundColor:'#EDF4EE',borderRadius:16,padding:16,gap:13},
 differencesTitle:{fontSize:20,fontWeight:'800',color:colors.ink},
 additiveEvidenceSummary:{borderTopWidth:1,borderTopColor:'#D6E1D8',paddingTop:13,gap:9},
 evidenceHighlightRow:{gap:3},
 evidenceCode:{fontSize:15,fontWeight:'800',color:colors.ink},
 evidenceDescription:{fontSize:14,lineHeight:21,color:colors.ink},
 evidenceSource:{fontSize:14,lineHeight:22,color:colors.ink},
 differenceRow:{gap:5},
 differenceDivider:{borderTopWidth:1,borderTopColor:'#D6E1D8',paddingTop:12},
 differenceLabel:{fontSize:14,fontWeight:'800',color:colors.green},
 qualityCard:{backgroundColor:'#FFF3E5',borderRadius:14,padding:15,gap:8},qualityHeading:{fontSize:15,fontWeight:'800',color:'#80551C'},
 tableHeader:{flexDirection:'row',borderBottomColor:colors.line,borderBottomWidth:2,paddingBottom:10},
 tableRow:{flexDirection:'row',borderBottomColor:colors.line,borderBottomWidth:1,paddingVertical:12,gap:7,alignItems:'center'},
 metricLabel:{flex:1.35,fontSize:13,color:colors.ink},metricValue:{flex:1,fontSize:13,textAlign:'right',color:colors.ink,fontWeight:'700'},
 ingredients:{backgroundColor:'white',borderRadius:13,borderColor:colors.line,borderWidth:1,padding:14,gap:10},
 additiveBox:{backgroundColor:'white',borderRadius:13,borderColor:colors.line,borderWidth:1,padding:14,gap:7},
 nutrientPreview:{backgroundColor:'white',borderWidth:1,borderColor:colors.line,borderRadius:16,padding:15,gap:3},
 previewHeading:{fontSize:16,fontWeight:'800',color:colors.ink,marginBottom:9},
 quickPanel:{backgroundColor:'#EDF4EE',borderRadius:18,padding:16,gap:10},
 quickTitle:{fontSize:21,fontWeight:'800',color:colors.ink},
 quickHint:{fontSize:12,lineHeight:18,color:colors.muted},
 quickRow:{gap:4},
 quickDivider:{borderTopWidth:1,borderTopColor:'#D5E2D8',paddingTop:10},
 quickTrigger:{minHeight:60,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:5},
 quickText:{flex:1,gap:5},
 quickLabel:{fontSize:14,fontWeight:'800',color:colors.green},
 quickSummary:{fontSize:15,lineHeight:22,color:colors.ink},
 quickArrow:{fontSize:24,color:colors.green},
 quickExplanation:{paddingTop:4,paddingBottom:10},
 quickFootnote:{fontSize:12,lineHeight:19,color:colors.muted,paddingTop:8},
 disclosures:{borderBottomWidth:1,borderBottomColor:colors.line},
 detailSection:{borderTopWidth:1,borderTopColor:colors.line},
 detailHeader:{minHeight:62,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:12},
 detailTitle:{flex:1,fontSize:17,fontWeight:'700',color:colors.ink},
 detailArrow:{fontSize:24,color:colors.green},
 detailContent:{gap:13,paddingBottom:21},
 detailSubheading:{fontSize:15,fontWeight:'800',color:colors.ink},
 additionalDifference:{gap:5,paddingVertical:7},
});
