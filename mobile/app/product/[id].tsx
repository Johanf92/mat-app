import { useState } from 'react';
import { useLocalSearchParams, Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View, Pressable, Modal, StyleSheet } from 'react-native';
import { products } from '../../src/products';

type InfoTopic='nova'|'sugar'|'ingredients';
const help:Record<InfoTopic,{title:string;description:string;details:string}>={
  nova:{title:'Hva er NOVA?',description:'NOVA deler matvarer i fire grupper etter bearbeidingsgrad.',details:'1: Ubearbeidet eller minimalt bearbeidet.\n2: Bearbeidede kulinariske ingredienser, som olje og sukker.\n3: Bearbeidede matvarer.\n4: Ultrabearbeidede matvarer.\n\nNOVA er ikke en samlet vurdering av hvor sunn maten er.'},
  sugar:{title:'Hva betyr sukker per 100 g?',description:'Tallet viser totalt sukker, inkludert naturlig forekommende sukker.',details:'For eksempel inneholder naturell yoghurt naturlig melkesukker (laktose). Total sukkerverdi forteller ikke alene hvor mye sukker som er tilsatt.'},
  ingredients:{title:'Hvordan lese ingredienslisten?',description:'Ingredienser oppgis vanligvis i synkende rekkefølge etter vekt da produktet ble laget.',details:'Listen hjelper deg å forstå hva produktet består av. Husk at en kort ingrediensliste ikke automatisk betyr at et produkt er sunnere.'}
};
export default function Product() {
 const {id}=useLocalSearchParams<{id:string}>();
 const p=products.find(x=>x.id===id);
 const [topic,setTopic]=useState<InfoTopic|null>(null);
 const [expanded,setExpanded]=useState<'ingredients'|'nutrition'|null>(null);
 if(!p)return <SafeAreaView style={s.page}><Text>Produktet finnes ikke.</Text><Link href="/">Tilbake</Link></SafeAreaView>;
 const summary=p.id==='naturell'?'En enkel yoghurt uten tilsatt sukker i dette eksemplet. Inneholder naturlig melkesukker.':'Inneholder protein, men også tilsatt sukker i dette eksemplet. NOVA sier noe om bearbeiding, ikke om samlet helse.';
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
   <Link href="/" style={s.back}>← Tilbake</Link>
   <View style={s.productHeader}><View style={s.productImage}><Text style={s.productEmoji}>◻</Text></View><View style={s.productMeta}><Text style={s.label}>FIKTIVT EKSEMPEL</Text><Text style={s.title}>{p.name}</Text><Text style={s.brand}>{p.brand}</Text></View></View>
   <View style={s.summary}><Text style={s.summaryTitle}>Kort oppsummert</Text><Text style={s.body}>{summary}</Text></View>
   <View style={s.tiles}>
     <Pressable accessibilityRole="button" onPress={()=>setTopic('nova')} style={s.tile}><Text style={s.tileLabel}>Bearbeiding  ⓘ</Text><Text style={s.tileValue}>NOVA {p.nova??'?'}</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={()=>setTopic('sugar')} style={s.tile}><Text style={s.tileLabel}>Sukker / 100 g  ⓘ</Text><Text style={s.tileValue}>{p.sugar} g</Text></Pressable>
   </View>
   <Text style={s.section}>Dette bør du vite</Text>
   {p.positives.map(x=><Text key={x} style={s.fact}>✓  {x}</Text>)}
   {p.notes.map(x=><Text key={x} style={s.fact}>•  {x}</Text>)}
   <Pressable accessibilityRole="button" onPress={()=>setExpanded(expanded==='ingredients'?null:'ingredients')} style={s.accordion}><Text style={s.accordionTitle}>Ingredienser</Text><Text style={s.arrow}>{expanded==='ingredients'?'−':'+'}</Text></Pressable>
   {expanded==='ingredients'&&<View style={s.detail}><Text style={s.body}>{p.ingredients}</Text><Pressable onPress={()=>setTopic('ingredients')}><Text style={s.info}>ⓘ Slik leser du ingredienslisten</Text></Pressable></View>}
   <Pressable accessibilityRole="button" onPress={()=>setExpanded(expanded==='nutrition'?null:'nutrition')} style={s.accordion}><Text style={s.accordionTitle}>Næringsinnhold</Text><Text style={s.arrow}>{expanded==='nutrition'?'−':'+'}</Text></Pressable>
   {expanded==='nutrition'&&<View style={s.detail}><Text style={s.body}>Per 100 g</Text><Text style={s.body}>Protein: {p.protein} g</Text><Text style={s.body}>Sukker: {p.sugar} g</Text><Text style={s.body}>Fiber: {p.fiber} g</Text><Text style={s.body}>Salt: {p.salt} g</Text></View>}
   <Link href="/compare" style={s.compare}>⇄  Sammenlign med annet produkt →</Link>
   <Text style={s.disclaimer}>Alle produktdata på denne skjermen er fiktive. Ikke bruk dem til allergivurdering.</Text>
 </ScrollView>
 <Modal visible={topic!==null} transparent animationType="fade" onRequestClose={()=>setTopic(null)}>
   <View style={s.overlay}><View style={s.dialog}>
     <Text style={s.dialogTitle}>{topic?help[topic].title:''}</Text>
     <Text style={s.body}>{topic?help[topic].description:''}</Text>
     <Text style={s.dialogDetails}>{topic?help[topic].details:''}</Text>
     <Pressable accessibilityRole="button" onPress={()=>setTopic(null)} style={s.close}><Text style={s.closeText}>Lukk</Text></Pressable>
   </View></View>
 </Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#FAFBF8'},page:{padding:24,paddingBottom:60,gap:16},back:{color:'#286E4E',fontSize:16,fontWeight:'700',marginBottom:8},
 productHeader:{flexDirection:'row',gap:15,alignItems:'center'},productImage:{width:78,height:90,borderRadius:17,backgroundColor:'#E9EFE9',alignItems:'center',justifyContent:'center'},productEmoji:{fontSize:35,color:'#8BA392'},productMeta:{flex:1,gap:5},label:{fontSize:11,fontWeight:'800',color:'#9C7C51'},title:{fontSize:25,fontWeight:'800',color:'#1C3428'},brand:{fontSize:14,color:'#708477'},
 summary:{backgroundColor:'#E4F1E7',padding:19,borderRadius:18,gap:8,marginTop:8},summaryTitle:{fontSize:17,fontWeight:'800',color:'#21543B'},body:{fontSize:15,lineHeight:23,color:'#42594A'},tiles:{flexDirection:'row',gap:12},tile:{flex:1,backgroundColor:'white',borderWidth:1,borderColor:'#E0E9E2',padding:16,borderRadius:16,gap:9},tileLabel:{fontSize:12,color:'#718578'},tileValue:{fontSize:21,fontWeight:'800',color:'#203B2B'},
 section:{fontSize:18,fontWeight:'800',color:'#203B2B',marginTop:10},fact:{fontSize:15,lineHeight:23,color:'#42594A'},accordion:{borderTopWidth:1,borderTopColor:'#E3E9E4',paddingVertical:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},accordionTitle:{fontSize:17,fontWeight:'700',color:'#203B2B'},arrow:{fontSize:23,color:'#4B755D'},detail:{paddingBottom:15,gap:8},info:{color:'#286E4E',fontWeight:'700',paddingVertical:7},
 compare:{backgroundColor:'#E8F1EA',padding:17,borderRadius:14,color:'#266848',fontWeight:'800',textAlign:'center',marginTop:8},disclaimer:{fontSize:12,lineHeight:19,color:'#8C826F'},
 overlay:{flex:1,backgroundColor:'rgba(17,35,23,0.48)',justifyContent:'center',padding:24},dialog:{backgroundColor:'white',borderRadius:24,padding:24,gap:16},dialogTitle:{fontSize:23,fontWeight:'800',color:'#1C3428'},dialogDetails:{fontSize:14,lineHeight:23,color:'#506759'},close:{backgroundColor:'#246C4C',padding:15,borderRadius:13,alignItems:'center'},closeText:{fontWeight:'800',color:'white'}
});
