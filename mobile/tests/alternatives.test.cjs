const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');

const sourcePath=path.resolve(__dirname,'../src/alternatives.ts');
const out=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
 fileName:sourcePath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true
});
assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const calls=[];
let categoryResults=[],textResults=[];
const loaded=new Module(sourcePath,module);loaded.filename=sourcePath;
loaded.require=id=>{
 if(id==='./openFoodFacts')return {
  searchByCategory:async (...args)=>{calls.push({type:'category',args});if(categoryResults instanceof Error)throw categoryResults;return categoryResults;},
  searchProducts:async (...args)=>{calls.push({type:'text',args});if(textResults instanceof Error)throw textResults;return textResults;}
 };
 throw Error('Unexpected dependency: '+id);
};
loaded._compile(out.outputText,sourcePath);
const {productProfile,comparableCategory,relevantAlternatives,findAlternatives}=loaded.exports;
const market={code:'no',name:'Norge',tag:'en:norway'};
const base={code:'7394376616037',name:'iKaffe',brand:'Oatly',ingredients:'Havrebas, rapsolje, salt',categories:[],countries:['en:norway'],nova:3,
 protein:1.1,fat:3,carbs:7.1,sugar:3.4,energy:61,salt:0.1,fiber:0.8,additives:[],allergens:[]};
const next=(code,patch={})=>({...base,code,...patch});

test('Oatly iKaffe is recognised even without category tags',()=>{
 assert.equal(productProfile(base).kind,'oat-barista');
 assert.equal(comparableCategory(base),'en:oat-drinks');
});
test('plain Greek yogurt is kept separate from flavoured and regular yogurts',()=>{
 const source=next('11111111',{name:'Gresk naturell yoghurt',brand:'Sample',ingredients:'Melk, yoghurtkultur',categories:[]});
 const good=next('22222222',{name:'Greek style yoghurt natural',brand:'Another',ingredients:'Milk, culture',categories:['en:greek-yogurts']});
 const strawberry=next('33333333',{name:'Greek strawberry yoghurt',brand:'Third',ingredients:'Milk, strawberry',categories:['en:greek-yogurts']});
 const regular=next('44444444',{name:'Naturell yoghurt',brand:'Fourth',ingredients:'Milk',categories:['en:yogurts']});
 assert.equal(productProfile(source).kind,'greek-plain');
 assert.deepEqual(relevantAlternatives(source,[good,strawberry,regular],market).map(x=>x.code),['22222222']);
});
test('barista oat drinks do not mix with plain oat or almond coffee drinks',()=>{
 const coffee=next('33333333',{name:'Oat Barista',brand:'Other Brand',ingredients:'Havre, vann',categories:[]});
 const plain=next('44444444',{name:'Havredrikk naturell',brand:'Other',ingredients:'Havre, vann'});
 const almond=next('55555555',{name:'Almond Barista',brand:'Almond Inc',ingredients:'Mandel, vann'});
 assert.deepEqual(relevantAlternatives(base,[coffee,plain,almond],market).map(x=>x.code),['33333333']);
});
test('explicit flavoured categories and coffee flavours are not plain alternatives',()=>{
 const source=next('11111111',{name:'Gresk naturell yoghurt',brand:'Plain',ingredients:'Melk, kultur',categories:[]});
 const flavouredGreek=next('22222222',{name:'Greek yogurt',brand:'Flavor',ingredients:'Milk, flavour',categories:['en:flavored-greek-yogurts']});
 assert.deepEqual(relevantAlternatives(source,[flavouredGreek],market),[]);
 const chocolate=next('33333333',{name:'Chocolate Oat Barista',brand:'Cocoa',ingredients:'Oats, cocoa',categories:['en:oat-drinks']});
 assert.deepEqual(relevantAlternatives(base,[chocolate],market),[]);
});
test('norwegian market guard, same identity and incomplete entries are filtered',()=>{
 const good=next('22222222',{name:'Barista Havredrikk',brand:'Other',countries:['en:norway']});
 const foreign=next('33333333',{name:'Barista Havredrikk',brand:'Other2',countries:['en:sweden']});
 const duplicate=next('44444444',{name:'iKaffe',brand:'Oatly'});
 const empty=next('55555555',{name:'Havre Barista',brand:'Empty',ingredients:undefined,protein:null,fat:null,carbs:null,sugar:null,nova:null,image:undefined});
 assert.deepEqual(relevantAlternatives(base,[good,foreign,duplicate,empty],market).map(x=>x.code),['22222222']);
});
test('one text search is used rather than unreliable category facets',async()=>{
 calls.length=0;textResults=[
  next('22222222',{name:'Havredrikk Barista',brand:'Other'}),
  next('33333333',{name:'Coffee syrup toffee',brand:'Syrup',ingredients:'Sukker'})
 ];
 const results=await findAlternatives(base,market);
 assert.deepEqual(results.map(x=>x.code),['22222222']);
 assert.equal(calls.length,1);
 assert.equal(calls[0].type,'text');
 assert.equal(calls[0].args[0],'barista');
 assert.equal(calls[0].args[1],market);
});
test('greek yoghurt text candidates must be natural and registered for Norway',async()=>{
 calls.length=0;textResults=[
  next('22222222',{name:'Gresk yoghurt naturell',brand:'Other',ingredients:undefined,countries:['en:norway']}),
  next('33333333',{name:'Gresk jordbaeryoghurt',brand:'Other',countries:['en:norway']}),
  next('44444444',{name:'Greek yoghurt',brand:'Foreign',countries:['en:sweden']}),
 ];
 const greek=next('11111111',{name:'Gresk naturell yoghurt',brand:'Source',ingredients:'Melk, kultur'});
 const results=await findAlternatives(greek,market);
 assert.deepEqual(results.map(x=>x.code),['22222222']);
 assert.equal(calls.length,1);
 assert.equal(calls[0].args[0],'gresk yoghurt');
});
test('unsupported products do not trigger API searches',async()=>{
 calls.length=0;
 const pasta=next('99999999',{name:'Pasta Bolognese',brand:'Generic',ingredients:'Pasta, tomato',categories:[]});
 assert.equal(productProfile(pasta),null);
 const result=await findAlternatives(pasta,market);
 assert.deepEqual(result,[]);assert.equal(calls.length,0);
});
test('search error is not silently mistaken for no available alternatives',async()=>{
 calls.length=0;textResults=new Error('Søketjenesten svarer ikke');
 try{await assert.rejects(findAlternatives(base,market),/Søketjenesten svarer ikke/);}
 finally{textResults=[];}
});
