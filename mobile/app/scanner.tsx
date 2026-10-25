import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProduct } from '../src/openFoodFacts';
import { colors } from '../src/ui';

export default function Scanner() {
 const router=useRouter();
 const [permission,requestPermission]=useCameraPermissions();
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const locked=useRef(false);
 async function scanned({data}:{data:string}) {
  const code=data.trim();
  if(locked.current||!/^\d{8,14}$/.test(code))return;
  locked.current=true;setBusy(true);setMessage('Slår opp produktet…');
  try{
   const product=await getProduct(code);
   if(product){router.replace({pathname:'/product/[id]',params:{id:code}});return;}
   setMessage('Strekkoden '+code+' finnes ikke i Open Food Facts.');
  }catch{setMessage('Kunne ikke slå opp produktet. Sjekk nettilkoblingen og prøv igjen.');}
  setBusy(false);
 }
 function retry(){locked.current=false;setBusy(false);setMessage('');}
 return <SafeAreaView style={s.safe} edges={['top','bottom','left','right']}>
  <View style={s.header}><Pressable onPress={()=>router.back()} accessibilityRole="button"><Text style={s.back}>← Tilbake</Text></Pressable><Text style={s.title}>Skann en matvare</Text></View>
  {!permission ? <ActivityIndicator color={colors.green}/> : !permission.granted ?
   <View style={s.center}><Text style={s.info}>Matkontroll trenger kameratilgang for å lese strekkoder. Ingen bilder lagres.</Text>
    <Pressable style={s.button} onPress={()=>{void requestPermission();}}><Text style={s.buttonText}>{permission.canAskAgain?'Gi kameratilgang':'Kameratilgang er avslått i telefonens innstillinger'}</Text></Pressable>
   </View> :
   <View style={s.cameraWrap}><CameraView style={StyleSheet.absoluteFill} facing="back" active={!busy}
      barcodeScannerSettings={{barcodeTypes:['ean13','ean8','upc_a','upc_e','itf14']}}
      onBarcodeScanned={busy?undefined:({data})=>{void scanned({data});}}/>
    <View pointerEvents="none" style={s.target}><View style={s.frame}/></View>
   </View>}
  <View style={s.footer}><Text style={s.info}>{message||'Hold strekkoden innenfor rammen. Produktet slås opp globalt, uansett valgt land.'}</Text>
   {busy&&<ActivityIndicator color={colors.green}/>}
   {!!message&&!busy&&<Pressable style={s.button} onPress={retry}><Text style={s.buttonText}>Skann på nytt</Text></Pressable>}
  </View>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:colors.page},header:{padding:20,gap:14},back:{color:colors.green,fontWeight:'700',fontSize:16},title:{fontSize:25,fontWeight:'800',color:colors.ink},
 cameraWrap:{flex:1,backgroundColor:'#15271D',overflow:'hidden'},target:{flex:1,justifyContent:'center',alignItems:'center'},frame:{width:'75%',height:165,borderRadius:22,borderColor:'#E4F3D8',borderWidth:3},
 center:{flex:1,justifyContent:'center',padding:24,gap:20},footer:{padding:22,gap:12},info:{color:colors.muted,fontSize:15,lineHeight:23,textAlign:'center'},
 button:{backgroundColor:colors.green,padding:15,borderRadius:12,alignItems:'center'},buttonText:{color:'white',fontWeight:'700',textAlign:'center'}
});
