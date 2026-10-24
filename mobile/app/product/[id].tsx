import { useLocalSearchParams, Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from 'react-native';
import { products } from '../../src/products';
export default function Product() {
 const {id}=useLocalSearchParams<{id:string}>(); const p=products.find(x=>x.id===id);
 if(!p)return <SafeAreaView style={s.page}><Text>Produktet finnes ikke.</Text><Link href="/">Tilbake</Link></SafeAreaView>;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
 <Link href="/" style={s.link}>← Tilbake</Link><Text style={s.warning}>FIKTIVT EKSEMPEL</Text><Text style={s.title}>{p.name}</Text><Text>{p.brand}</Text>
 <View style={s.pill}><Text style={s.pillText}>NOVA {p.nova??'ukjent'} · bearbeidingsgrad</Text></View>
 <Text style={s.heading}>Dette er positivt</Text>{p.positives.map(x=><Text key={x} style={s.body}>✓ {x}</Text>)}
 <Text style={s.heading}>Verdt å merke seg</Text>{p.notes.map(x=><Text key={x} style={s.body}>• {x}</Text>)}
 <Text style={s.heading}>Ingredienser</Text><Text style={s.body}>{p.ingredients}</Text>
 <Text style={s.heading}>Næringsinnhold per 100 g</Text><Text style={s.body}>Protein: {p.protein} g · Sukker: {p.sugar} g</Text><Text style={s.body}>Fiber: {p.fiber} g · Salt: {p.salt} g</Text>
 <Text style={s.small}>NOVA er ikke en samlet helsevurdering. Alle tall her er fiktive.</Text><Link href="/compare" style={s.link}>Sammenlign →</Link>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F8FAF7'},page:{padding:24,gap:13},link:{color:'#26734F',fontSize:16,fontWeight:'700'},warning:{color:'#937246',fontSize:12,fontWeight:'800'},title:{fontSize:32,fontWeight:'800',color:'#193328'},pill:{alignSelf:'flex-start',backgroundColor:'#E1F0E5',padding:12,borderRadius:12},pillText:{color:'#285E40',fontWeight:'700'},heading:{fontSize:19,fontWeight:'800',color:'#193328',marginTop:12},body:{fontSize:16,lineHeight:24,color:'#435B4B'},small:{fontSize:12,lineHeight:19,color:'#7C7865',marginTop:15}});
