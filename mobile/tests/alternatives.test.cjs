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
test('search falls back to text if category tags yield too few alternatives',async()=>{
 calls.length=0;categoryResults=[];textResults=[next('22222222',{name:'Havre barista drikk',brand:'Different'})];
 const results=await findAlternatives(base,market);
 assert.deepEqual(results.map(x=>x.code),['22222222']);
 assert.equal(calls.length,2);
 assert.equal(calls[0].type,'category');assert.equal(calls[0].args[0],'en:oat-drinks');
 assert.equal(calls[1].type,'text');assert.equal(calls[1].args[0],'barista');
 assert.equal(calls[1].args[1],market);
});
test('sufficient category results skip redundant full-text requests',async()=>{
 calls.length=0;textResults=[];
 categoryResults=Array.from({length:5},(_,i)=>next(String(11111111+i),{name:'Oat Barista '+i,brand:'Brand '+i}));
 const results=await findAlternatives(base,market);
 assert.equal(results.length,5);assert.equal(calls.length,1);
});
test('unsupported products do not trigger API searches',async()=>{
 calls.length=0;
 assert.equal(productProfile(next('99999999',{name:'Pasta Bolognese',brand:'Generic',ingredients:'Pasta, tomato',categories:[]})),null);
 const result=await findAlternatives(next('99999999',{name:'Pasta Bolognese',brand:'Generic',ingredients:'Pasta, tomato',categories:[]}),market);
 assert.deepEqual(result,[]);assert.equal(calls.length,0);
});

test('category service failure falls back to a narrowly matched text search',async()=>{
 calls.length=0;categoryResults=new Error('503');textResults=[next('22222222',{name:'Havre barista drikk',brand:'Different'})];
 try{
  const results=await findAlternatives(base,market);
  assert.deepEqual(results.map(x=>x.code),['22222222']);
  assert.deepEqual(calls.map(x=>x.type),['category','text']);
 }finally{categoryResults=[];textResults=[];}
});
test('partial category results survive a failing fallback search',async()=>{
 calls.length=0;categoryResults=[next('22222222',{name:'Havre barista drikk',brand:'Different'})];textResults=new Error('503');
 try{
  const results=await findAlternatives(base,market);
  assert.equal(results.length,1);
 }finally{categoryResults=[];textResults=[];}
});
test('both search requests failing reports an error rather than pretending no matches exist',async()=>{
 calls.length=0;categoryResults=new Error('503');textResults=new Error('502');
 try{await assert.rejects(findAlternatives(base,market),/502/);}
 finally{categoryResults=[];textResults=[];}
});
