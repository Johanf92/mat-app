import { useState } from 'react';
import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { products } from '../src/products';
export default function Home() {
 const [query,setQuery]=useState('');
 const filtered=products.filter(p=>(p.name+' '+p.brand).toLowerCase().includes(query.toLowerCase()));
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
 <Text style={s.brand}>MATKONTROLL</Text><Text style={s.title}>Vit hva du spiser.</Text>
 <Text style={s.body}>Se bak emballasjen. Forstå hva maten inneholder, uten pekefinger.</Text>
 <View style={s.hero}><Text style={s.heroTitle}>Se bak etiketten</Text><Text style={s.body}>Søk etter en matvare og få en enkel forklaring.</Text><Text style={s.small}>Strekkodeskanning kommer senere.</Text></View>
 <TextInput accessibilityLabel="Søk etter matvare" placeholder="Søk etter matvare…" value={query} onChangeText={setQuery} style={s.input}/>
 <Text style={s.section}>Eksempelprodukter</Text><Text style={s.small}>Fiktive data – ikke ekte produktanalyser.</Text>
 {filtered.map(p=><Link key={p.id} href={{pathname:'/product/[id]',params:{id:p.id}}} style={s.card}><Text style={s.item}>{p.name}{'\n'}<Text style={s.small}>{p.brand} · NOVA {p.nova ?? 'ukjent'} →</Text></Text></Link>)}
 {filtered.length===0&&<Text>Ingen produkter funnet.</Text>}
 <Link href="/compare" style={s.link}>Sammenlign produktene →</Link>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F8FAF7'},page:{padding:24,paddingTop:35,gap:14},brand:{fontWeight:'800',letterSpacing:2,color:'#34745A'},title:{fontSize:35,fontWeight:'800',color:'#193328'},body:{fontSize:16,lineHeight:24,color:'#526B5C'},hero:{backgroundColor:'#E1F0E5',padding:22,borderRadius:22,gap:10},heroTitle:{fontSize:22,fontWeight:'800',color:'#234F38'},small:{fontSize:12,color:'#7C7865'},input:{backgroundColor:'white',padding:17,borderRadius:14,borderWidth:1,borderColor:'#E1E8E2',fontSize:16},section:{fontSize:20,fontWeight:'800',color:'#193328'},card:{backgroundColor:'white',borderRadius:15,padding:18,borderWidth:1,borderColor:'#E4EAE5'},item:{fontSize:17,fontWeight:'700',lineHeight:26,color:'#213D2C'},link:{fontSize:16,fontWeight:'800',color:'#27704C',marginTop:12}});
