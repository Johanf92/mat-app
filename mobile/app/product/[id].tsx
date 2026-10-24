import { useEffect, useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View, Pressable, Modal, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { FoodProduct, getProduct } from '../../src/openFoodFacts';

type Topic='nova'|'sugar'|'ingredients';
const help:Record<Topic,{title:string;body:string}>={
 nova:{title:'Hva er NOVA?',body:'NOVA klassifiserer mat etter bearbeidingsgrad.\n\n1: Ubearbeidet eller minimalt bearbeidet\n2: Bearbeidede kulinariske ingredienser\n3: Bearbeidede matvarer\n4: Ultrabearbeidede matvarer\n\nNOVA er ikke en samlet vurdering av hvor sunn maten er.'},
 sugar:{title:'Hva betyr sukker per 100 g?',body:'Dette er totalt sukker, også naturlig forekommende sukker. Tallet alene forteller ikke om sukkeret er tilsatt.'},
 ingredients:{title:'Hvordan lese ingredienslisten?',body:'Ingrediensene er normalt oppført i synkende rekkefølge etter vekt. Manglende ingrediensinformasjon betyr ikke at produktet er fritt for bestemte stoffer.'}
};
function amount(n:number|null,unit='g'){return n===null?'Ikke oppgitt':n.toLocaleString('nb-NO',{maximumFractionDigits:1})+' '+unit;}
export default function ProductScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [p,setP]=useState<FoodProduct|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [topic,setTopic]=useState<Topic|null>(null);
 const [expanded,setExpanded]=useState<'ingredients'|'nutrition'|'additives'|null>(null);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setP(null);setError('');
  getProduct(id??'',controller.signal).then(item=>{if(!controller.signal.aborted){setP(item);if(!item)setError('Fant ikke produktet i Open Food Facts.');}}).catch(()=>{if(!controller.signal.aborted)setError('Kunne ikke hente produktet. Prøv igjen senere.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return ()=>controller.abort();
 },[id]);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Link href="/" style={s.back}>← Tilbake til søk</Link>
  {loading&&<ActivityIndicator color="#246C4C" size="large"/>}
  {!!error&&<Text style={s.body}>{error}</Text>}
  {p&&<>
   <View style={s.productHeader}>{p.image?<Image source={{uri:p.image}} style={s.photo} resizeMode="contain"/>:<View style={s.photo}/>}<View style={s.meta}><Text style={s.source}>OPEN FOOD FACTS</Text><Text style={s.title}>{p.name}</Text><Text style={s.brand}>{p.brand}</Text>{p.quantity&&<Text style={s.brand}>{p.quantity}</Text>}</View></View>
   <View style={s.summary}><Text style={s.summaryTitle}>Kort oppsummert</Text><Text style={s.body}>{p.ingredients?'Ingredienslisten er tilgjengelig. Utforsk innholdet og næringsverdiene nedenfor.':'Ingredienslisten er ikke oppgitt for dette produktet.'} {p.nova===null?'Bearbeidingsgrad er ikke oppgitt.':''}</Text></View>
   <View style={s.tiles}>
    <Pressable onPress={()=>setTopic('nova')} style={s.tile}><Text style={s.tileLabel}>Bearbeiding  ⓘ</Text><Text style={s.tileValue}>{p.nova===null?'Ukjent':'NOVA '+p.nova}</Text></Pressable>
    <Pressable onPress={()=>setTopic('sugar')} style={s.tile}><Text style={s.tileLabel}>Sukker / 100 g  ⓘ</Text><Text style={s.tileValue}>{amount(p.sugar)}</Text></Pressable>
   </View>
   <Pressable onPress={()=>setExpanded(expanded==='ingredients'?null:'ingredients')} style={s.accordion}><Text style={s.accordionTitle}>Ingredienser</Text><Text style={s.arrow}>{expanded==='ingredients'?'−':'+'}</Text></Pressable>
   {expanded==='ingredients'&&<View style={s.detail}><Text style={s.body}>{p.ingredients||'Ikke oppgitt.'}</Text><Pressable onPress={()=>setTopic('ingredients')}><Text style={s.info}>ⓘ Slik leser du ingredienslisten</Text></Pressable></View>}
   <Pressable onPress={()=>setExpanded(expanded==='nutrition'?null:'nutrition')} style={s.accordion}><Text style={s.accordionTitle}>Næringsinnhold</Text><Text style={s.arrow}>{expanded==='nutrition'?'−':'+'}</Text></Pressable>
   {expanded==='nutrition'&&<View style={s.detail}><Text style={s.body}>Per 100 g / 100 ml (som oppgitt i datakilden)</Text><Text style={s.body}>Energi: {amount(p.energy,'kcal')}</Text><Text style={s.body}>Protein: {amount(p.protein)}</Text><Text style={s.body}>Sukker: {amount(p.sugar)}</Text><Text style={s.body}>Fiber: {amount(p.fiber)}</Text><Text style={s.body}>Salt: {amount(p.salt)}</Text></View>}
   <Pressable onPress={()=>setExpanded(expanded==='additives'?null:'additives')} style={s.accordion}><Text style={s.accordionTitle}>Tilsetningsstoffer og allergener</Text><Text style={s.arrow}>{expanded==='additives'?'−':'+'}</Text></Pressable>
   {expanded==='additives'&&<View style={s.detail}><Text style={s.body}>Registrerte tilsetningsstoffer: {p.additives.length?p.additives.map(x=>x.replace(/^en:/,'')).join(', '):'Ingen opplysninger registrert'}</Text><Text style={s.body}>Registrerte allergener: {p.allergens.length?p.allergens.map(x=>x.replace(/^en:/,'')).join(', '):'Ingen opplysninger registrert'}</Text><Text style={s.warning}>Manglende registrering betyr IKKE at produktet er uten tilsetningsstoffer eller allergener. Kontroller alltid emballasjen.</Text></View>}
   <Text style={s.disclaimer}>Produktdata er hentet fra Open Food Facts og kan være feil eller ufullstendige. Sjekk alltid emballasjen, spesielt ved allergi. NOVA er ikke en helsescore.</Text>
   <Text style={s.source}>Kilde: Open Food Facts · Strekkode: {p.code}</Text>
  </>}
 </ScrollView>
 <Modal visible={topic!==null} transparent animationType="fade" onRequestClose={()=>setTopic(null)}><View style={s.overlay}><View style={s.dialog}><Text style={s.dialogTitle}>{topic?help[topic].title:''}</Text><Text style={s.body}>{topic?help[topic].body:''}</Text><Pressable onPress={()=>setTopic(null)} style={s.close}><Text style={s.closeText}>Lukk</Text></Pressable></View></View></Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#FAFBF8'},page:{padding:24,paddingBottom:65,gap:16},back:{color:'#286E4E',fontSize:16,fontWeight:'700',marginBottom:8},
 productHeader:{flexDirection:'row',gap:14,alignItems:'center'},photo:{width:86,height:102,borderRadius:15,backgroundColor:'#E9EFE9'},meta:{flex:1,gap:5},source:{fontSize:11,fontWeight:'700',color:'#8C8069'},title:{fontSize:24,fontWeight:'800',color:'#1C3428'},brand:{fontSize:14,color:'#708477'},
 summary:{backgroundColor:'#E4F1E7',padding:19,borderRadius:18,gap:8,marginTop:8},summaryTitle:{fontSize:17,fontWeight:'800',color:'#21543B'},body:{fontSize:15,lineHeight:23,color:'#42594A'},
 tiles:{flexDirection:'row',gap:12},tile:{flex:1,backgroundColor:'white',borderWidth:1,borderColor:'#E0E9E2',padding:15,borderRadius:16,gap:9},tileLabel:{fontSize:12,color:'#718578'},tileValue:{fontSize:19,fontWeight:'800',color:'#203B2B'},
 accordion:{borderTopWidth:1,borderTopColor:'#E3E9E4',paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},accordionTitle:{fontSize:17,fontWeight:'700',color:'#203B2B'},arrow:{fontSize:23,color:'#4B755D'},detail:{paddingBottom:16,gap:8},info:{color:'#286E4E',fontWeight:'700',paddingVertical:7},warning:{fontSize:13,lineHeight:20,color:'#8A6E45'},disclaimer:{fontSize:12,lineHeight:19,color:'#827B6C',marginTop:8},
 overlay:{flex:1,backgroundColor:'rgba(17,35,23,0.48)',justifyContent:'center',padding:24},dialog:{backgroundColor:'white',borderRadius:24,padding:24,gap:16},dialogTitle:{fontSize:23,fontWeight:'800',color:'#1C3428'},close:{backgroundColor:'#246C4C',padding:15,borderRadius:13,alignItems:'center'},closeText:{fontWeight:'800',color:'white'}
});
