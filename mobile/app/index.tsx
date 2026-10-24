import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, TextInput, View, Pressable, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { FoodProduct, searchProducts } from '../src/openFoodFacts';

export default function Home() {
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<FoodProduct[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  const q=query.trim();
  if(q.length<2){setResults([]);setLoading(false);setError('');return;}
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setLoading(true);setError('');
   try{const items=await searchProducts(q,controller.signal);if(!controller.signal.aborted)setResults(items);}
   catch(e){if(!controller.signal.aborted){setResults([]);setError('Kunne ikke hente produkter. Prøv igjen om litt.');}}
   finally{if(!controller.signal.aborted)setLoading(false);}
  },650);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[query]);
 return <SafeAreaView style={s.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
  <View style={s.header}><Text style={s.brand}>◉  matkontroll</Text><Text style={s.beta}>BETA</Text></View>
  <View style={s.intro}><Text style={s.title}>Hva inneholder maten din?</Text><Text style={s.subtitle}>Se bak etiketten. Vit hva du spiser.</Text></View>
  <View style={s.scan}><Text style={s.scanIcon}>▣</Text><Text style={s.scanTitle}>Skann strekkode</Text><Text style={s.scanSub}>Kameraskanning kommer snart</Text></View>
  <Text style={s.or}>ELLER SØK ETTER EN MATVARE</Text>
  <TextInput accessibilityLabel="Søk etter matvare eller merke" placeholder="Prøv f.eks. havregryn eller yoghurt" placeholderTextColor="#87958B" value={query} onChangeText={setQuery} style={s.input} autoCorrect={false}/>
  {query.trim().length>=2 ? <View style={s.results}>
   <Text style={s.caption}>Produktinformasjon fra Open Food Facts · kan være ufullstendig</Text>
   {loading&&<ActivityIndicator color="#246C4C"/>}
   {!!error&&<Text style={s.message}>{error}</Text>}
   {!loading&&!error&&results.length===0&&<Text style={s.message}>Ingen produkter funnet. Prøv et annet søkeord.</Text>}
   {!loading&&results.map(p=><Link key={p.code} href={{pathname:'/product/[id]',params:{id:p.code}}} style={s.product}>
    <View style={s.productRow}>{p.image?<Image source={{uri:p.image}} style={s.thumb} resizeMode="contain"/>:<View style={s.thumb}/>}<View style={s.productInfo}><Text numberOfLines={2} style={s.productName}>{p.name}</Text><Text numberOfLines={1} style={s.productBrand}>{p.brand}  →</Text></View></View>
   </Link>)}
  </View>:<Text style={s.caption}>Søk etter et produkt for å se ekte matvaredata.</Text>}
  <Text style={s.attribution}>Data: Open Food Facts · openfoodfacts.org</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#FAFBF8'},page:{padding:24,paddingTop:25,paddingBottom:55,gap:16},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{fontSize:21,fontWeight:'800',color:'#20543C'},beta:{fontSize:11,fontWeight:'800',color:'#758C7D',letterSpacing:1},
 intro:{marginTop:30,gap:10,marginBottom:6},title:{fontSize:33,lineHeight:40,fontWeight:'800',color:'#1C3428'},subtitle:{fontSize:16,color:'#63796B'},
 scan:{backgroundColor:'#246C4C',borderRadius:22,paddingVertical:20,alignItems:'center',gap:6},scanIcon:{fontSize:31,color:'white'},scanTitle:{fontSize:19,fontWeight:'800',color:'white'},scanSub:{fontSize:12,color:'#D9EBDE'},
 or:{textAlign:'center',fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#89958C',marginTop:4},
 input:{backgroundColor:'white',borderWidth:1,borderColor:'#DDE6DF',borderRadius:16,padding:17,fontSize:16,color:'#243D2D'},
 results:{gap:10},caption:{fontSize:12,lineHeight:18,color:'#7B8B80'},message:{fontSize:14,color:'#5E7265',paddingVertical:12},
 product:{padding:12,backgroundColor:'white',borderWidth:1,borderColor:'#E1E9E3',borderRadius:16},productRow:{flexDirection:'row',alignItems:'center',gap:12},thumb:{width:55,height:60,backgroundColor:'#EEF3EE',borderRadius:9},productInfo:{flex:1,gap:5},productName:{fontSize:16,fontWeight:'700',color:'#1E3929'},productBrand:{fontSize:13,color:'#77877B'},attribution:{fontSize:11,color:'#819187',marginTop:15}
});
