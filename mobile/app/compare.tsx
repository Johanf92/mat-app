import { Link } from 'expo-router';
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from 'react-native';
import { products } from '../src/products';
export default function Compare() {
 const [a,b]=products;
 const rows:[string,string,string][]=[['NOVA',String(a.nova),String(b.nova)],['Protein / 100 g',a.protein+' g',b.protein+' g'],['Sukker / 100 g',a.sugar+' g',b.sugar+' g'],['Fiber / 100 g',a.fiber+' g',b.fiber+' g'],['Salt / 100 g',a.salt+' g',b.salt+' g']];
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}><Link href="/" style={s.link}>← Tilbake</Link><Text style={s.title}>Sammenlign matvarer</Text><Text style={s.note}>Fiktive produkter og verdier – kun demonstrasjon.</Text><View style={s.row}><Text style={s.head}>{a.name}</Text><Text style={s.head}>{b.name}</Text></View>{rows.map(([label,left,right])=><View key={label} style={s.card}><Text style={s.note}>{label}</Text><View style={s.row}><Text style={s.value}>{left}</Text><Text style={s.value}>{right}</Text></View></View>)}<Text style={s.note}>NOVA og næringsverdier er informasjon, ikke en automatisk fasit.</Text></ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#F8FAF7'},page:{padding:24,gap:16},link:{color:'#26734F',fontSize:16,fontWeight:'700'},title:{fontSize:30,fontWeight:'800',color:'#193328'},note:{fontSize:13,lineHeight:20,color:'#7C7865'},row:{flexDirection:'row',gap:12},head:{flex:1,fontSize:16,fontWeight:'800',color:'#285E40'},card:{padding:16,borderRadius:14,backgroundColor:'white',gap:10},value:{flex:1,fontSize:18,fontWeight:'700',color:'#193328'}});
