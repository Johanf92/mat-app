// Component-handler tests with mocked hooks. This does not render on a phone.
// From mobile: node --test tests/compare-progressive-ui.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');

const filename=path.resolve(__dirname,'../app/compare.tsx');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 fileName:filename,reportDiagnostics:true,
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}
});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const first={code:'11111111',name:'Cola A',brand:'Example',image:undefined,nova:4,
 sugar:10.6,protein:0,fat:0,carbs:10.6,energy:42,fiber:null,salt:0,
 ingredients:'Vann, E338',additives:['en:e338']};
const second={...first,code:'22222222',name:'Cola B',ingredients:'Vann, E211, E338',additives:['en:e211','en:e338']};
const facts=[
 {key:'sugar',label:'Sukkerarter',summary:'Samme sukkerinnhold: 10,6 g.',detail:'Registrerte sukkerarter er like. Tallet sier ikke alt om sukker.'},
 {key:'additive-E211',label:'E211 · Natriumbenzoat',summary:'Oppført for B.',detail:'E211 er oppført for B i de tilgjengelige feltene.'},
 {key:'nova',label:'Bearbeiding',summary:'Begge NOVA 4.',detail:'NOVA er ikke en helsescore.'}
];
function harness(){
 const state=[];let cursor=0;const routes=[];
 const jsx=(type,props)=>({type,props:props||{}});
 const mocks={
  react:{
   useState(initial){
    const idx=cursor++;
    if(!(idx in state))state[idx]=idx===0?first:idx===1?second:idx===2?false:initial;
    return[state[idx],next=>{state[idx]=typeof next==='function'?next(state[idx]):next;}];
   },
   useEffect(){},
   useRef(value){return {current:value};}
  },
  'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
  'expo-router':{
    useLocalSearchParams:()=>({left:first.code,right:second.code}),
    useRouter:()=>({canGoBack:()=>false,back(){},replace(x){routes.push(x);},push(x){routes.push(x);},setParams(x){routes.push(x);}})
  },
  'react-native':{
   ActivityIndicator:'ActivityIndicator',Image:'Image',Keyboard:{dismiss(){}},
   Pressable:'Pressable',ScrollView:'ScrollView',Text:'Text',TextInput:'TextInput',
   View:'View',StyleSheet:{create:styles=>styles}
  },
  'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
  '../src/openFoodFacts':{getProduct:async()=>first,searchProducts:async()=>[]},
  '../src/MarketContext':{useMarket:()=>({market:{code:'no',name:'Norge',tag:'en:norway'}})},
  '../src/comparison':{
    COMPARE_OPTIONS:[{key:'processing',label:'Bearbeiding'},{key:'ingredients',label:'Ingredienser'},{key:'protein',label:'Protein'},{key:'sugar',label:'Sukker'}],
    METRICS:[{key:'energy',label:'Energi',unit:'kcal'},{key:'sugar',label:'Hvorav sukkerarter',unit:'g'}],
    metricAmount:(p,key,unit)=>String(p[key])+' '+unit,comparisonInsight:()=> 'NOVA er ikke en helsescore.',
    comparisonDataWarnings:()=>[],keyDifferences:()=>[{key:'ingredients',label:'Ingredienser',description:'Ulik kildeordlyd.'}],
    additiveEvidenceRows:()=>[{
      code:'E211',displayCode:'E211',name:'Natriumbenzoat',role:'Konserveringsmiddel',
      aEvidence:'not-recorded',bEvidence:'both',differs:true
    }],
    additiveEvidenceLabel:s=>s==='both'?'Ingrediens og felt':'Ikke oppført',
    quickComparisonFacts:()=>facts
  },
  '../src/alternatives':{productProfile:()=>({kind:'cola-regular'}),candidateNote:()=>null,relatedVariantComparisonNote:()=>null},
  '../src/additives':{
    additiveInfo:()=>({id:'E211',name:'Natriumbenzoat',description:'Konserveringsmiddel',source:'https://example.org'}),
    formatAdditiveCode:s=>s,summarizeAdditives:()=>({unrecognized:[]})
  },
  '../src/ingredientEvidence':{displayIngredientText:s=>s},
  '../src/productDataStatus':{productDataStatus:()=>({headline:'Oppgitt i kilden: 7 av 7 næringsfelt.',notes:[]})},
  '../src/nutriScore':{nutriScoreLabel:x=>x?x.toUpperCase():'Ikke oppgitt'},
  '../src/ui':{colors:{green:'#236b4b',page:'#fafbf8',ink:'#1c3428',muted:'#617368',line:'#dde6df'},
   InfoSheet:'InfoSheet',NovaBadge:'NovaBadge',SourceLink:'SourceLink'}
 };
 const mod={exports:{}};
 vm.runInNewContext(compiled.outputText,{
  module:mod,exports:mod.exports,
  require(name){if(!(name in mocks))throw Error('Unexpected import '+name);return mocks[name];}
 },{filename});
 return {routes,render(){cursor=0;return mod.exports.default();}};
}
function flatten(node){
 if(node===null||node===undefined||node===false)return [];
 if(Array.isArray(node))return node.flatMap(flatten);
 if(typeof node!=='object')return [];
 if(typeof node.type==='function')return flatten(node.type(node.props));
 return[node,...flatten(node.props?.children)];
}
function byId(tree,id){return flatten(tree).find(node=>node.props?.testID===id);}
function text(node){
 if(node===null||node===undefined||node===false)return'';
 if(Array.isArray(node))return node.map(text).join(' ');
 if(typeof node==='string'||typeof node==='number')return String(node);
 if(typeof node==='object')return text(node.props?.children);
 return '';
}

test('quick summary appears immediately while deep data stays collapsed',()=>{
 const h=harness(),tree=h.render();
 assert.ok(byId(tree,'comparison-overview'));
 assert.match(text(byId(tree,'comparison-overview')),/Sukkerarter/);
 assert.match(text(byId(tree,'comparison-overview')),/E211/);
 assert.equal(byId(tree,'quick-detail-sugar'),undefined);
 assert.equal(byId(tree,'detail-content-nutrition'),undefined);
 assert.equal(byId(tree,'detail-content-ingredients'),undefined);
 assert.equal(byId(tree,'detail-content-additives'),undefined);
 assert.equal(byId(tree,'detail-content-sources'),undefined);
 assert.equal(byId(tree,'toggle-detail-nutrition').props.accessibilityState.expanded,false);
 assert.equal(h.routes.length,0);
});
test('tapping one quick finding explains it inline, then closes without leaving comparison',()=>{
 const h=harness();
 const button=byId(h.render(),'quick-fact-additive-E211');
 assert.equal(button.props.accessibilityState.expanded,false);
 button.props.onPress();
 assert.match(text(byId(h.render(),'quick-detail-additive-E211')),/E211 er oppført/);
 assert.equal(byId(h.render(),'quick-fact-additive-E211').props.accessibilityState.expanded,true);
 byId(h.render(),'quick-fact-additive-E211').props.onPress();
 assert.equal(byId(h.render(),'quick-detail-additive-E211'),undefined);
 assert.equal(h.routes.length,0);
});
test('nutrition, ingredients and additive evidence open as independent sections',()=>{
 const h=harness();
 byId(h.render(),'toggle-detail-nutrition').props.onPress();
 assert.match(text(byId(h.render(),'detail-content-nutrition')),/Energi/);
 assert.equal(byId(h.render(),'detail-content-additives'),undefined);
 byId(h.render(),'toggle-detail-ingredients').props.onPress();
 assert.equal(byId(h.render(),'detail-content-nutrition'),undefined);
 assert.match(text(byId(h.render(),'detail-content-ingredients')),/Vann, E211/);
 byId(h.render(),'toggle-detail-additives').props.onPress();
 assert.equal(byId(h.render(),'detail-content-ingredients'),undefined);
 assert.match(text(byId(h.render(),'detail-content-additives')),/Natriumbenzoat/);
 assert.equal(h.routes.length,0);
});
test('source links remain available only after explicitly opening source section',()=>{
 const h=harness();
 assert.equal(byId(h.render(),'detail-content-sources'),undefined);
 byId(h.render(),'toggle-detail-sources').props.onPress();
 const content=byId(h.render(),'detail-content-sources');
 assert.match(text(content),/Produkt A/);
 assert.equal(flatten(content).filter(x=>x.type==='SourceLink').length,2);
 assert.equal(h.routes.length,0);
});


test('a failed remote comparison photo shows a visible fallback instead of blank space',()=>{
 const before=first.image;
 first.image='https://example.invalid/test-image.jpg';
 try {
  const h=harness();
  const image=flatten(h.render()).find(n=>n.type==='Image'&&n.props?.source?.uri===first.image);
  assert.ok(image,'an image must be attempted first');
  assert.equal(typeof image.props.onError,'function');
  image.props.onError();
  const after=h.render();
  assert.match(text(after),/Kunne ikke laste bildet/);
  assert.equal(h.routes.length,0);
 } finally {first.image=before;}
});


test('comparison shows Nutri-Score as an independent source value, not a ranking',()=>{
 const h=harness(),whole=text(h.render());
 assert.match(whole,/Nutri-Score:\s+Ikke oppgitt/);
 assert.doesNotMatch(whole,/best ernæringsprofil|sunnere vinner/);
});


test('NOVA and Nutri-Score remain independent descriptions in comparison',()=>{
 const h=harness(),content=text(h.render());
 assert.match(content,/Nutri-Score \(A–E\) beskriver næringsprofil/);
 assert.match(content,/NOVA \(1–4\) beskriver bearbeiding/);
 assert.doesNotMatch(content,/kårer vinner|sunnest valgt/);
});
