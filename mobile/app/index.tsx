import { useState } from 'react';
import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, TextInput, View, Pressable, StyleSheet } from 'react-native';
import { products } from '../src/products';

export default function Home() {
  const [query,setQuery]=useState('');
  const [searching,setSearching]=useState(false);
  const filtered=products.filter(p=>(p.name+' '+p.brand).toLowerCase().includes(query.toLowerCase()));
  return <SafeAreaView style={s.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <View style={s.header}><Text style={s.brand}>◉  matkontroll</Text><Text style={s.version}>BETA</Text></View>
    <View style={s.intro}><Text style={s.title}>Hva inneholder maten din?</Text><Text style={s.subtitle}>Se bak etiketten. Vit hva du spiser.</Text></View>
    <Pressable accessibilityRole="button" onPress={()=>setSearching(true)} style={s.scan}><Text style={s.scanIcon}>▣</Text><Text style={s.scanTitle}>Skann strekkode</Text><Text style={s.scanSub}>Kameraskanning kommer snart</Text></Pressable>
    <Text style={s.or}>ELLER SØK ETTER EN MATVARE</Text>
    <TextInput accessibilityLabel="Søk etter matvare eller merke" placeholder="Produkt eller merke…" placeholderTextColor="#87958B" value={query} onChangeText={v=>{setQuery(v);setSearching(true);}} onFocus={()=>setSearching(true)} style={s.input}/>
    {(searching || query.length>0) && <View style={s.results}>
      <Text style={s.helper}>Demo: fiktive eksempelprodukter</Text>
      {filtered.map(p=><Link key={p.id} href={{pathname:'/product/[id]',params:{id:p.id}}} style={s.product}><Text style={s.productText}>{p.name}{'\n'}<Text style={s.productBrand}>{p.brand}  →</Text></Text></Link>)}
      {filtered.length===0&&<Text style={s.helper}>Ingen produkter funnet.</Text>}
    </View>}
    {!searching && <View style={s.bottom}><Text style={s.bottomTitle}>Enklere matvalg, uten pekefinger.</Text><Text style={s.helper}>Søk for å prøve prototypen med eksempeldata.</Text></View>}
    <Link href="/compare" style={s.compare}>Sammenlign eksempelprodukter →</Link>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FAFBF8'},page:{padding:24,paddingTop:25,paddingBottom:50,gap:16},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{fontSize:21,fontWeight:'800',color:'#20543C'},version:{fontSize:11,fontWeight:'800',color:'#758C7D',letterSpacing:1},
  intro:{marginTop:45,gap:12,marginBottom:12},title:{fontSize:34,lineHeight:41,fontWeight:'800',color:'#1C3428'},subtitle:{fontSize:16,color:'#63796B',lineHeight:24},
  scan:{backgroundColor:'#246C4C',borderRadius:24,paddingVertical:30,alignItems:'center',gap:8},scanIcon:{fontSize:40,color:'#FFFFFF'},scanTitle:{fontSize:21,fontWeight:'800',color:'white'},scanSub:{fontSize:12,color:'#D9EBDE'},
  or:{textAlign:'center',fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#89958C',marginTop:10},
  input:{backgroundColor:'white',borderWidth:1,borderColor:'#DDE6DF',borderRadius:16,padding:18,fontSize:16,color:'#243D2D'},
  results:{gap:10},helper:{fontSize:13,lineHeight:20,color:'#7B8B80'},product:{padding:17,backgroundColor:'white',borderWidth:1,borderColor:'#E1E9E3',borderRadius:16},productText:{fontSize:17,fontWeight:'700',lineHeight:26,color:'#1E3929'},productBrand:{fontSize:13,color:'#77877B',fontWeight:'400'},
  bottom:{marginTop:34,gap:8,alignItems:'center'},bottomTitle:{fontSize:16,fontWeight:'700',color:'#3B5B46',textAlign:'center'},compare:{color:'#276F4D',fontWeight:'700',textAlign:'center',marginTop:20}
});
