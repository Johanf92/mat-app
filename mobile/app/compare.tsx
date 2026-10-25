import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FoodProduct, getProduct, searchProducts } from '../src/openFoodFacts';
import { useMarket } from '../src/MarketContext';
import { type CompareFocus, COMPARE_OPTIONS, METRICS, comparisonInsight, metricAmount, comparisonDataWarnings, keyDifferences, additiveEvidenceRows, additiveEvidenceLabel, additiveDifferenceSummary } from '../src/comparison';
import { productProfile, candidateNote } from '../src/alternatives';
import { additiveInfo, formatAdditiveCode, summarizeAdditives, type AdditiveInfo } from '../src/additives';
import { displayIngredientText } from '../src/ingredientEvidence';
import { colors, InfoSheet, NovaBadge, SourceLink } from '../src/ui';

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
 const [selectedAdditive,setSelectedAdditive]=useState<AdditiveInfo|null>(null);
 const searchController=useRef<AbortController|null>(null);
 useEffect(()=>{
   const controller=new AbortController();
   setError('');setLoading(true);setLeft(null);setRight(null);
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
 const variantWarning=left&&right?candidateNote(left,right):null;
 const notices=left&&right?comparisonDataWarnings(left,right):[];
 const evidenceRows=left&&right?additiveEvidenceRows(left,right):[];
 const evidenceDifferences=evidenceRows.filter(row=>row.differs);
 const sharedCodes=evidenceRows.filter(row=>!row.differs&&row.aEvidence!=='not-recorded');
 return <SafeAreaView style={s.safe} edges={['top','bottom','left','right']}>
  <View style={s.toolbar}><Pressable accessibilityRole="button" onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={s.backButton}><Text style={s.back}>← Tilbake</Text></Pressable></View>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <Text accessibilityRole="header" style={s.title}>Sammenlign matvarer</Text>
    <Text style={s.note}>Faktiske registrerte verdier fra Open Food Facts. Ingen automatisk vinner.</Text>
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
        {p.image?<Image source={{uri:p.image}} style={s.resultImage} resizeMode="contain"/>:<View style={s.resultImage}/>}
        <View style={{flex:1,gap:4}}><Text style={s.resultName}>{p.name}</Text><Text style={s.note}>{p.brand}</Text><NovaBadge group={p.nova} compact/></View>
        <Text style={s.arrow}>›</Text>
      </Pressable>)}
      <Text style={s.note}>Tekstsøk filtreres etter valgt land. Strekkoder slås opp globalt. Registrering betyr ikke at varen finnes i butikk.</Text>
    </View>}
    {left&&right&&!loading&&<>
      <View style={s.productGrid}>
       {[left,right].map((p,index)=><View key={p.code} style={s.productCard}>
        {p.image?<Image source={{uri:p.image}} style={s.productImage} resizeMode="contain"/>:<View style={s.productImage}/>}
        <Text style={s.columnCaption}>PRODUKT {index===0?'A':'B'}</Text>
        <Text numberOfLines={3} style={s.productName}>{p.name}</Text><Text numberOfLines={2} style={s.note}>{p.brand}</Text>
        <NovaBadge group={p.nova} compact/>
       </View>)}
      </View>
      <Text style={s.note}>Opplysningene hentes på nytt fra produktdatabasen. Forslagslisten kan vise eldre verdier.</Text>
      <Pressable accessibilityRole="button" style={s.change} onPress={()=>{setRight(null);router.setParams({right:''});}}><Text style={s.changeText}>Endre produkt B →</Text></Pressable>
      {!sameType&&<Text style={s.warning}>Disse varene er ikke bekreftet som samme produkttype. Sammenligningen kan derfor være mindre relevant.</Text>}
      {!!sameType&&<Text style={s.note}>Varene er registrert som samme hovedtype. Oppskrift og variant kan likevel være forskjellige.</Text>}
      {!!variantWarning&&<Text style={s.warning}>{variantWarning}</Text>}
      <View testID="key-differences" style={s.differences}>
       <Text accessibilityRole="header" style={s.differencesTitle}>Hva er forskjellen?</Text>
       {keyDifferences(left,right).map((entry,index)=><View key={entry.key} style={[s.differenceRow,index>0&&s.differenceDivider]}>
         <Text style={s.differenceLabel}>{entry.label}</Text>
         <Text style={s.body}>{entry.description}</Text>
       </View>)}
       {evidenceRows.length>0&&<View testID="additive-evidence-summary" style={s.additiveEvidenceSummary}>
         <Text style={s.differenceLabel}>E-koder – hva er oppført?</Text>
         {evidenceDifferences.length>0?evidenceDifferences.slice(0,3).map(row=><View key={row.code} style={s.evidenceHighlightRow}>
           <Text style={s.evidenceCode}>{row.displayCode} · {row.name}</Text>
           <Text style={s.evidenceDescription}>{row.role}. {additiveDifferenceSummary(row)}</Text>
         </View>):<Text style={s.body}>De eksplisitte E-kodene har samme registreringsstatus hos begge varene.</Text>}
         {evidenceDifferences.length>3&&<Text style={s.note}>Ytterligere {evidenceDifferences.length-3} forskjeller i E-koderegistreringene er vist lenger ned.</Text>}
         {sharedCodes.length>0&&<Text style={s.note}>Oppført på samme måte for begge: {sharedCodes.slice(0,5).map(row=>row.displayCode).join(', ')}{sharedCodes.length>5?' med flere':''}.</Text>}
         <Text style={s.note}>Ulik registrering er ikke bevis på at et stoff mangler i den andre varen. Dette er ingen sikkerhets- eller sunnhetsrangering.</Text>
       </View>}
       <Text style={s.note}>Bare registrerte opplysninger. Kontroller varevariant og målegrunnlag på emballasjen.</Text>
      </View>
      <Text style={s.section}>Hva vil du se nærmere på?</Text>
      <View style={s.options}>
        {COMPARE_OPTIONS.map(o=><Pressable key={o.key} accessibilityRole="button" accessibilityState={{selected:focus===o.key}} style={[s.option,focus===o.key&&s.optionSelected]} onPress={()=>setFocus(o.key)}>
         <Text style={[s.optionText,focus===o.key&&s.optionTextSelected]}>{o.label}</Text>
        </Pressable>)}
      </View>
      <View style={s.insight}><Text style={s.insightTitle}>Dette viser dataene</Text><Text style={s.body}>{comparisonInsight(left,right,focus)}</Text></View>
      {notices.length>0&&<View style={s.qualityCard}><Text style={s.qualityHeading}>Verdt å kontrollere</Text>{notices.map((note,i)=><Text key={i} style={s.warning}>{note}</Text>)}</View>}
      <Text style={s.section}>Næringsinnhold</Text>
      <Text style={s.note}>Per 100 g / 100 ml som oppgitt av kilden. Manglende verdier er ikke null.</Text>
      <View style={s.tableHeader}><Text style={s.metricLabel}>Egenskap</Text><Text style={s.metricValue}>A</Text><Text style={s.metricValue}>B</Text></View>
      {METRICS.map(m=><View key={m.key} style={s.tableRow}><Text style={s.metricLabel}>{m.label}</Text><Text style={s.metricValue}>{metricAmount(left,m.key,m.unit)}</Text><Text style={s.metricValue}>{metricAmount(right,m.key,m.unit)}</Text></View>)}
      <Text style={s.section}>Ingredienser</Text>
      {[left,right].map((p,index)=><View key={p.code+'ingredients'} style={s.ingredients}><Text style={s.resultName}>Produkt {index===0?'A':'B'} · {p.name}</Text>
       <Text style={s.body} numberOfLines={showIngredients?undefined:5}>{displayIngredientText(p.ingredients)||'Ingredienslisten er ikke oppgitt.'}</Text>
      </View>)}
      <Pressable accessibilityRole="button" onPress={()=>setShowIngredients(!showIngredients)} style={s.change}><Text style={s.changeText}>{showIngredients?'Vis mindre':'Vis hele ingredienslistene'}</Text></Pressable>
      <Text style={s.section}>E-koder og kildegrunnlag</Text>
      <Text style={s.note}>Kun eksplisitte E-koder fra de registrerte ingredienslistene og databasens separate E-kodefelt. Trykk på en kode for forklaring.</Text>
      {evidenceRows.length===0&&<Text style={s.note}>Ingen E-koder er dokumentert i disse feltene. Dette bekrefter ikke at varene er uten tilsetningsstoffer.</Text>}
      {evidenceRows.map(row=><Pressable key={row.code} accessibilityRole="button" accessibilityLabel={'Les om '+row.displayCode}
        onPress={()=>setSelectedAdditive(additiveInfo(row.code))} style={s.additiveBox}>
        <Text style={s.resultName}>{row.displayCode} · {row.name}  ⓘ</Text>
        <Text style={s.note}>{row.role}</Text>
        <Text style={s.evidenceSource}>A · {additiveEvidenceLabel(row.aEvidence)}</Text>
        <Text style={s.evidenceSource}>B · {additiveEvidenceLabel(row.bEvidence)}</Text>
      </Pressable>)}
      {([['A',left],['B',right]] as const).map(([letter,p])=>{
        const raw=summarizeAdditives(p.additives).unrecognized;
        return raw.length>0?<Text key={'raw-'+letter} style={s.note}>Produkt {letter} har også koder med ukjent format i datakilden: {raw.join(', ')}.</Text>:null;
      })}
      <Text style={s.note}>Manglende kode i disse feltene betyr ikke at stoffet er fraværende. E290 er karbondioksid; en ensidig E290-registrering beviser ikke ulikt innhold av kullsyre.</Text>
      <Text style={s.warning}>Kildeopplysninger kan være ufullstendige. Kontroller alltid emballasjen ved allergi. NOVA er ikke en samlet helsevurdering.</Text>
      <SourceLink label="Kilde for produkt A (åpner nettleseren)" url={'https://world.openfoodfacts.org/product/'+left.code}/>
      <SourceLink label="Kilde for produkt B (åpner nettleseren)" url={'https://world.openfoodfacts.org/product/'+right.code}/>
    </>}
  </ScrollView>
  <InfoSheet visible={selectedAdditive!==null}
    title={selectedAdditive?formatAdditiveCode(selectedAdditive.id)+' · '+selectedAdditive.name:''}
    onClose={()=>setSelectedAdditive(null)}>
    <Text style={s.body}>{selectedAdditive?.description}</Text>
    <Text style={s.note}>Funksjonen beskriver stoffet generelt. Vi kjenner ikke mengden brukt i den aktuelle varen.</Text>
    {!!selectedAdditive&&<SourceLink label="Kilde for E-nummer og stoffnavn" url={selectedAdditive.source}/>}
  </InfoSheet>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.page},toolbar:{paddingHorizontal:18,borderBottomWidth:1,borderBottomColor:colors.line},
 backButton:{minHeight:48,justifyContent:'center'},back:{fontSize:16,fontWeight:'700',color:colors.green},
 page:{padding:22,paddingBottom:55,gap:15},title:{fontSize:29,fontWeight:'800',color:colors.ink},
 note:{fontSize:12,lineHeight:19,color:colors.muted},body:{fontSize:15,lineHeight:23,color:colors.ink},section:{fontSize:19,fontWeight:'800',color:colors.ink,marginTop:6},
 warning:{fontSize:13,lineHeight:21,color:'#80551C'},pick:{gap:13,backgroundColor:'#EFF5EF',padding:16,borderRadius:18},
 input:{fontSize:16,backgroundColor:'white',borderRadius:12,padding:14,borderWidth:1,borderColor:colors.line,color:colors.ink},
 button:{backgroundColor:colors.green,borderRadius:12,padding:15,alignItems:'center',minHeight:48},buttonText:{color:'white',fontSize:15,fontWeight:'700'},
 disabled:{opacity:0.5},result:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'white',borderRadius:13,borderColor:colors.line,borderWidth:1,padding:12},
 resultImage:{width:54,height:62,borderRadius:8,backgroundColor:'#E9EEE9'},resultName:{fontSize:15,fontWeight:'700',color:colors.ink},arrow:{color:colors.green,fontSize:25},
 productGrid:{flexDirection:'row',gap:12},productCard:{flex:1,backgroundColor:'white',borderColor:colors.line,borderWidth:1,borderRadius:16,padding:12,gap:8,minWidth:0},
 productImage:{width:'100%',height:95,borderRadius:10,backgroundColor:'#EDF2ED'},columnCaption:{fontSize:11,letterSpacing:0.6,color:colors.muted,fontWeight:'800'},
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
 additiveBox:{backgroundColor:'white',borderRadius:13,borderColor:colors.line,borderWidth:1,padding:14,gap:7}
});
