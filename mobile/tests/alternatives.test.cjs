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
const {productProfile,comparableCategory,relevantAlternatives,findAlternatives,candidateNote,labeledLactoseFree,relatedVariantComparisonNote,fallbackProductIcon}=loaded.exports;
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


test('regular cola finds only original-style cola, never zero, energy or novelty flavours', async () => {
 const coca=next('5449000000996',{name:'Coca-Cola Original Taste',brand:'Coca-Cola',ingredients:'Vann, sukker',categories:['en:colas'],carbs:10.6,sugar:10.6});
 const classic=next('1111111100001',{name:'Pepsi Cola',brand:'Pepsi',ingredients:undefined,carbs:11,sugar:11,categories:['en:colas']});
 const another=next('1111111100002',{name:'Classic Cola',brand:'Other Brand',ingredients:undefined,carbs:10,sugar:10,categories:['en:colas']});
 const zero=next('1111111100003',{name:'Coca-Cola Zero Sugar',brand:'Coca-Cola',sugar:0,categories:['en:colas']});
 const energy=next('1111111100004',{name:'CocaCola Energy',brand:'Coca-Cola',categories:['en:colas']});
 const novelty=next('1111111100005',{name:'Coca-Cola Dreamworld',brand:'Coca-Cola',categories:['en:colas']});
 const candy=next('1111111100006',{name:'Cola gummies',brand:'Sweet',categories:[]});
 const cherry=next('1111111100007',{name:'Cherry Coke',brand:'Coca-Cola',categories:['en:colas']});
 assert.equal(productProfile(coca).kind,'cola-regular');
 const matched=relevantAlternatives(coca,[classic,zero,energy,novelty,candy,another,cherry],market);
 assert.deepEqual(new Set(matched.map(x=>x.code)),new Set([classic.code,another.code]));
 calls.length=0;textResults=[classic,another,zero,energy,novelty,candy,cherry];
 const fetched=await findAlternatives(coca,market);
 assert.equal(calls.length,1);
 assert.equal(calls[0].args[0],'cola');
 assert.deepEqual(new Set(fetched.map(x=>x.code)),new Set([classic.code,another.code]));
});

test('sugar-free cola is not automatically mixed with original, energy, cherry or caffeine-free', async () => {
 const source=next('1111111100010',{name:'Coca-Cola Zero Sugar',brand:'Coca-Cola',categories:['en:colas'],sugar:0});
 const max=next('1111111100011',{name:'Pepsi Max',brand:'Pepsi',categories:['en:colas'],sugar:0});
 const light=next('1111111100012',{name:'Coca-Cola Light',brand:'Coca-Cola',categories:['en:colas'],sugar:0});
 const original=next('1111111100013',{name:'Coca-Cola Original Taste',brand:'Coca-Cola',categories:['en:colas'],sugar:10.6});
 const energy=next('1111111100014',{name:'Coca Cola Energy Zero',brand:'Coca-Cola',categories:['en:colas'],sugar:0});
 const cherry=next('1111111100015',{name:'Coca Cola Zero Cherry',brand:'Coca-Cola',categories:['en:colas'],sugar:0});
 const decaf=next('1111111100016',{name:'Coca-Cola Zero Caffeine-free',brand:'Coca-Cola',categories:['en:colas'],sugar:0});
 assert.equal(productProfile(source).kind,'cola-sugar-free');
 assert.deepEqual(new Set(relevantAlternatives(source,[original,energy,light,cherry,max,decaf],market).map(p=>p.code)),
  new Set([max.code,light.code]));
 calls.length=0;textResults=[max,original];
 await findAlternatives(source,market);
 assert.equal(calls[0].args[0],'cola zero');
});

test('ambiguous Greek yoghurt is not automatically labelled naturell', () => {
 const source=next('1111111100020',{name:'Gresk Yoghurt Naturell',brand:'Tine',ingredients:'Melk, yoghurtkultur'});
 const ambiguous=next('1111111100021',{name:'Gresk yoghurt',brand:'Other',ingredients:undefined,carbs:15.8,sugar:13});
 const sweetened=next('1111111100022',{name:'Gresk yoghurt',brand:'Other',ingredients:'Melk, sukker, yoghurtkultur',carbs:15.8,sugar:13});
 const unflavoured=next('1111111100023',{name:'Gresk yoghurt',brand:'Another',ingredients:'Melk, melkesyrekultur',carbs:4,sugar:4});
 const lactoseFree=next('1111111100024',{name:'Gresk yoghurt laktosefri',brand:'Dairy',ingredients:'Melk, laktase, melkesyrekultur',carbs:3,sugar:3});
 const skyr=next('1111111100025',{name:'Skyr naturell',brand:'Some',ingredients:'Melk, kultur'});
 assert.equal(productProfile(ambiguous),null);
 assert.equal(productProfile(sweetened),null);
 assert.equal(productProfile(unflavoured).kind,'greek-plain');
 const norwegianMilk=next('1111111100026',{name:'Gresk yoghurt',brand:'Local',ingredients:'Pasteurisert kumelk, melkesyrekultur'});
 assert.equal(productProfile(norwegianMilk).kind,'greek-plain');
 assert.equal(productProfile(skyr)?.kind,'skyr-plain'); // skyr is recognised separately, not suggested as yoghurt
 assert.deepEqual(new Set(relevantAlternatives(source,[ambiguous,sweetened,unflavoured,lactoseFree,skyr],market).map(p=>p.code)),
  new Set([unflavoured.code,lactoseFree.code]));
});

test('large nutrient differences are flagged as uncertain product data, not health advice', () => {
 const source=next('1111111100030',{name:'Gresk naturell yoghurt',brand:'First',ingredients:'Melk, kultur',carbs:3.3});
 const candidate=next('1111111100031',{name:'Gresk yoghurt naturell',brand:'Second',ingredients:'Melk, kultur',carbs:15.8});
 assert.match(candidateNote(source,candidate),/Stor forskjell i karbohydrater/);
 assert.equal(candidateNote(source,{...candidate,carbs:4.9}),null);
 assert.equal(candidateNote(source,{...candidate,carbs:4.9,ingredients:undefined}),null);
});

test('Norwegian compound havredrikk is recognised and separated from barista', () => {
 const ordinary=next('1111111100040',{name:'Havredrikk naturell',brand:'Other',ingredients:undefined,categories:[]});
 assert.equal(productProfile(ordinary).kind,'oat-drink');
 assert.deepEqual(relevantAlternatives(base,[ordinary],market),[]);
});

test('regular Coca-Cola search does not suggest repackaged Coca-Cola Original as a different drink', () => {
 const source=next('5449000000996',{name:'Coca-Cola Original Taste',brand:'Coca-Cola Europacific Partners Norge AS',categories:['en:colas'],ingredients:'Kullsyreholdig vann, sukker',sugar:10.6,carbs:10.6});
 const canned=next('1111111100081',{name:'Coca Cola original taste 330ml',brand:'Coca cola',categories:['en:colas'],ingredients:undefined,sugar:10.6,carbs:10.6});
 const bottle=next('1111111100082',{name:'Coca cola',brand:'COCA-COLA EUROPEAN PARTNERS NORGE A',categories:['en:colas'],ingredients:undefined,sugar:10.6,carbs:10.6});
 const grans=next('1111111100083',{name:'Cola',brand:'Grans',categories:['en:colas'],ingredients:'Vann, sukker',sugar:10.6,carbs:10.6});
 const petpack=next('1111111100084',{name:'Cola',brand:'PETPACK DRIKKER AS',categories:['en:colas'],ingredients:undefined,sugar:11,carbs:11});
 assert.deepEqual(new Set(relevantAlternatives(source,[canned,bottle,grans,petpack],market).map(p=>p.code)),new Set([grans.code,petpack.code]));
});

test('yoghurt duplicate aliases are collapsed, but lactose-free and unspecified variants remain separate', () => {
 const source=next('7038010069451',{name:'Gresk yogurt Laktosefri',brand:'TINE',ingredients:'Lettmelk, yoghurtkultur',nova:1,energy:64,protein:8.5,fat:2,carbs:3.3,sugar:3.3});
 const tine=next('1111111100090',{name:'Gresk Type Naturell Yoghurt',brand:'Tine',ingredients:'Lettmelk, yoghurtkultur',nova:3,energy:64,protein:8.5,fat:2,carbs:3.3,sugar:3.3});
 const synnove1=next('1111111100091',{name:'Gresk Yoghurt Naturell',brand:'Synnøve Finden AS',ingredients:undefined,energy:78,protein:8.3,fat:2,carbs:4.9,sugar:4.9,image:undefined});
 const synnove2=next('1111111100092',{name:'Gresk yoghurt Naturell',brand:'Synnøve',ingredients:undefined,energy:78,protein:8.3,fat:2,carbs:4.9,sugar:4.9,image:'https://images.example/synnoeve.jpg'});
 const results=relevantAlternatives(source,[synnove1,synnove2,tine],market);
 assert.equal(labeledLactoseFree(source),true);
 assert.equal(labeledLactoseFree(tine),false);
 assert.ok(results.some(p=>p.code===tine.code),'non-labelled TINE yoghurt remains comparable with a variant caution');
 assert.equal(results.filter(p=>p.brand.toLowerCase().startsWith('synn')).length,1,'aliases with the same documented nutrients collapse');
 assert.equal(results.find(p=>p.brand.toLowerCase().startsWith('synn')).code,synnove2.code,'prefer better-documented duplicate');
 assert.match(candidateNote(source,tine),/ikke registrert som laktosefri/);
 assert.match(candidateNote(source,tine),/Laktosefri betyr ikke melkefri/);
});

test('lactose-free label does not follow from an unspecified name or from missing allergen tags', () => {
 const source=next('1111111100093',{name:'Gresk yoghurt Naturell',brand:'A',ingredients:'Melk, kultur'});
 const candidate=next('1111111100094',{name:'Gresk yoghurt Laktosefri',brand:'B',ingredients:'Melk, kultur',allergens:[]});
 assert.equal(labeledLactoseFree(source),false);
 assert.equal(labeledLactoseFree(candidate),true);
 assert.match(candidateNote(source,candidate),/merket laktosefri/);
 assert.match(candidateNote(source,candidate),/ikke om produktet er melkefritt/);
});

test('original and zero cola are related variants for manual comparison, never identical recipes', () => {
  const original=next('1111111122200',{name:'Coca-Cola Original Taste',brand:'Coca-Cola',sugar:10.6,categories:['en:colas']});
  const zero=next('1111111122201',{name:'Coca-Cola Zero Sugar',brand:'Coca-Cola',sugar:0,categories:['en:colas']});
  assert.equal(productProfile(original).kind,'cola-regular');
  assert.equal(productProfile(zero).kind,'cola-sugar-free');
  assert.match(relatedVariantComparisonNote(original,zero),/produkt A er vanlig cola og produkt B er sukkerfri cola/);
  assert.match(relatedVariantComparisonNote(zero,original),/produkt A er sukkerfri cola og produkt B er vanlig cola/);
  assert.equal(relatedVariantComparisonNote(original,{...original,code:'1111111122202',brand:'Other Cola'}),null);
  assert.equal(relatedVariantComparisonNote(base,zero),null);
});

test('TINE naturell kefir has a conservative same-type alternatives search', async () => {
  const source=next('1111111100701',{name:'Kefir',brand:'TINE',ingredients:'Melk, kefirkultur',categories:[]});
  const similar=next('1111111100702',{name:'Kefir naturell',brand:'Meieriet',ingredients:'Melk, kefirkultur',categories:['en:kefirs']});
  const mango=next('1111111100703',{name:'Kefir mango',brand:'Meieriet',ingredients:'Melk, mango',categories:['en:kefirs']});
  const water=next('1111111100704',{name:'Water Kefir',brand:'Fermented',ingredients:'Vann, sukker',categories:['en:kefirs']});
  const flavoured=next('1111111100705',{name:'Kefir',brand:'Sweet',ingredients:'Melk, sukker, smakstilsetning',categories:['en:kefirs']});
  const foreign=next('1111111100706',{name:'Kefir',brand:'Foreign',countries:['en:sweden'],ingredients:'Milk, kefir cultures'});
  assert.equal(productProfile(source)?.kind,'kefir-plain');
  assert.equal(comparableCategory(source),'en:kefirs');
  assert.equal(productProfile(mango),null);
  assert.equal(productProfile(water),null);
  assert.equal(productProfile(flavoured),null);
  assert.deepEqual(relevantAlternatives(source,[similar,mango,water,flavoured,foreign],market).map(x=>x.code),[similar.code]);
  calls.length=0;textResults=[similar,mango,water,flavoured,foreign];
  const found=await findAlternatives(source,market);
  assert.deepEqual(found.map(x=>x.code),[similar.code]);
  assert.equal(calls.length,1);
  assert.equal(calls[0].args[0],'kefir');
});


test('naturell skyr is supported, flavoured skyr and drinking skyr are excluded',()=>{
 const source=next('9510000000001',{name:'Skyr naturell',brand:'Tine',ingredients:'Skummet melk, syrningskultur'});
 const valid=next('9510000000002',{name:'Skyr Natural',brand:'Q',ingredients:'Milk, culture'});
 const flavoured=next('9510000000003',{name:'Skyr Jordbær',brand:'Brand',ingredients:'Melk, jordbær'});
 const sweet=next('9510000000004',{name:'Skyr naturell',brand:'Sweet',ingredients:'Melk, sukker, kultur'});
 const drink=next('9510000000005',{name:'Skyr drikk naturell',brand:'Drink',ingredients:'Melk, kultur'});
 const ambiguous=next('9510000000006',{name:'Skyr',brand:'Mystery',ingredients:undefined});
 assert.equal(productProfile(source)?.kind,'skyr-plain');
 assert.equal(productProfile(ambiguous),null);
 assert.deepEqual(relevantAlternatives(source,[valid,flavoured,sweet,drink,ambiguous],market).map(p=>p.code),[valid.code]);
});
test('naturell cottage cheese is separate from yoghurt and flavoured variants',()=>{
 const source=next('9510000000010',{name:'Cottage Cheese Naturell',brand:'Tine',ingredients:'Melk, melkesyrekultur'});
 const valid=next('9510000000011',{name:'Cottage cheese original',brand:'Q',ingredients:'Milk, culture'});
 const pesto=next('9510000000012',{name:'Cottage Cheese Pesto',brand:'Another',ingredients:'Melk, kultur, pesto'});
 const yogurt=next('9510000000013',{name:'Naturell yoghurt',brand:'Q',ingredients:'Melk, kultur'});
 assert.equal(productProfile(source)?.kind,'cottage-cheese-plain');
 assert.deepEqual(relevantAlternatives(source,[valid,pesto,yogurt],market).map(p=>p.code),[valid.code]);
});
test('plain rolled oats stay separate from cereal mixes and explicitly gluten-free oats',()=>{
 const source=next('9510000000020',{name:'Havregryn store',brand:'First',ingredients:'Havregryn 100 %',categories:[]});
 const valid=next('9510000000021',{name:'Lettkokte Havregryn',brand:'Other',ingredients:'Havre'});
 const gf=next('9510000000022',{name:'Glutenfri havregryn',brand:'Glutenfri',ingredients:'Glutenfri havregryn'});
 const sweet=next('9510000000023',{name:'Havregryn med jordbær',brand:'Mix',ingredients:'Havre, sukker, bær'});
 const granola=next('9510000000024',{name:'Granola havregryn',brand:'Granola',ingredients:'Havregryn, nøtter'});
 assert.equal(productProfile(source)?.kind,'oats-plain');
 assert.equal(productProfile(gf)?.kind,'oats-gluten-free');
 assert.deepEqual(relevantAlternatives(source,[valid,gf,sweet,granola],market).map(p=>p.code),[valid.code]);
 assert.deepEqual(relevantAlternatives(gf,[source,valid],market),[]);
 assert.match(relatedVariantComparisonNote(source,gf),/ikke dokumentasjon/);
});
test('whole milk and low-fat milk are distinct, and lactose-free labels do not cross',()=>{
 const low=next('9510000000030',{name:'Lettmelk',brand:'TINE',ingredients:'Lettmelk'});
 const lowQ=next('9510000000031',{name:'Lettmelk 1 %',brand:'Q',ingredients:'Melk'});
 const whole=next('9510000000032',{name:'Helmelk',brand:'Q',ingredients:'Melk'});
 const lacto=next('9510000000033',{name:'Lettmelk laktosefri',brand:'TINE',ingredients:'Melk, laktase'});
 const flavoured=next('9510000000034',{name:'Lettmelk sjokolade',brand:'Chocolate',ingredients:'Melk, kakao'});
 const plant=next('9510000000035',{name:'Lettmelk',brand:'Plant',ingredients:'Havre, vann'});
 assert.equal(productProfile(low)?.kind,'milk-low-fat');
 assert.equal(productProfile(whole)?.kind,'milk-whole');
 assert.deepEqual(relevantAlternatives(low,[lowQ,whole,lacto,flavoured,plant],market).map(p=>p.code),[lowQ.code]);
 assert.deepEqual(relevantAlternatives(lacto,[lowQ,low],market),[]);
 assert.match(relatedVariantComparisonNote(low,whole),/lettmelk og den andre helmelk/);
});
test('new profiles search only in selected market with one controlled call',async()=>{
 const combos=[
  ['Skyr naturell','Melk, kultur','skyr'],
  ['Cottage cheese naturell','Melk, kultur','cottage cheese'],
  ['Havregryn','Havregryn','havregryn'],
  ['Lettmelk','Melk','lettmelk'],
  ['Helmelk','Melk','helmelk'],
 ];
 for(const [name,ingredients,fallback] of combos){
  const src=next('9510000000040',{name,brand:'Tine',ingredients,categories:[]});
  assert.ok(productProfile(src),name);
  calls.length=0;textResults=[
   next('9510000000041',{name,brand:'Other',ingredients,countries:['en:sweden']}),
  ];
  assert.deepEqual(await findAlternatives(src,market),[]);
  assert.equal(calls.length,1);
  assert.equal(calls[0].type,'text');
  assert.equal(calls[0].args[0],fallback);
  assert.equal(calls[0].args[1],market);
 }
 textResults=[];
});


test('wholegrain bread, white bread and rye crispbread are distinct use cases',()=>{
 const source=next('8800000000001',{name:'Grovbrød Fullkorn',brand:'Bakst',ingredients:'Fullkornshvete, vann, rug'});
 const whole=next('8800000000002',{name:'Grovbrød',brand:'Annet bakeri',ingredients:'Hvetemel, rug'});
 const white=next('8800000000003',{name:'Loff',brand:'Annet bakeri',ingredients:'Hvetemel, vann'});
 const rye=next('8800000000004',{name:'Rugknekkebrød',brand:'Annet bakeri',ingredients:'Rug, vann'});
 const seed=next('8800000000005',{name:'Frøknekkebrød',brand:'Frø',ingredients:'Solsikkefrø'});
 const oat=next('8800000000006',{name:'Havregryn',brand:'Tine',ingredients:'Havregryn'});
 assert.equal(productProfile(source)?.kind,'bread-wholegrain');
 assert.equal(productProfile(white)?.kind,'bread-white');
 assert.equal(productProfile(rye)?.kind,'crispbread-rye');
 assert.equal(productProfile(seed),null);
 assert.deepEqual(relevantAlternatives(source,[whole,white,rye,seed,oat],market).map(x=>x.code),[whole.code]);
 assert.match(relatedVariantComparisonNote(source,white),/ulikt|ulik/);
});
test('bread category never treats unlabelled loaf as verified gluten-free',()=>{
 const plain=next('8800000000010',{name:'Grovbrød',brand:'A',ingredients:'Hvetemel'});
 const glutenFree=next('8800000000011',{name:'Grovbrød glutenfri',brand:'B',ingredients:'Glutenfrie melblandinger'});
 assert.equal(productProfile(glutenFree),null,'ambiguous gluten-free breads require manual comparison');
 assert.deepEqual(relevantAlternatives(plain,[glutenFree],market),[]);
});
test('corn flakes are not chocolate cereals, cakes or baked oat snacks',()=>{
 const src=next('8800000000020',{name:'Corn Flakes',brand:'Brand A',ingredients:'Mais, sukker'});
 const valid=next('8800000000021',{name:'Cornflakes Original',brand:'Brand B',ingredients:'Mais, sukker'});
 const honey=next('8800000000022',{name:'Honey Corn Flakes',brand:'Brand C',ingredients:'Mais, honning'});
 const chocolate=next('8800000000023',{name:'Chocolate Cornflakes',brand:'Brand D',ingredients:'Mais, kakao'});
 const muesli=next('8800000000024',{name:'Havregryn og nøtter',brand:'Brand E',ingredients:'Havre'});
 assert.equal(productProfile(src)?.kind,'corn-flakes');
 assert.deepEqual(relevantAlternatives(src,[valid,honey,chocolate,muesli],market).map(x=>x.code),[valid.code]);
});
test('strawberry jam excludes raspberry, mixed fruits and reduced-sugar recipes',()=>{
 const src=next('8800000000030',{name:'Jordbærsyltetøy',brand:'First',ingredients:'Jordbær, sukker'});
 const good=next('8800000000031',{name:'Strawberry Jam',brand:'Second',ingredients:'Strawberries, sugar'});
 const raspberry=next('8800000000032',{name:'Bringebærsyltetøy',brand:'Third',ingredients:'Bringebær, sukker'});
 const mix=next('8800000000033',{name:'Jordbær- og rabarbrasyltetøy',brand:'Fourth',ingredients:'Jordbær, rabarbra, sukker'});
 const light=next('8800000000034',{name:'Jordbærsyltetøy uten tilsatt sukker',brand:'Fifth',ingredients:'Jordbær, søtstoff'});
 assert.equal(productProfile(src)?.kind,'jam-strawberry');
 assert.deepEqual(relevantAlternatives(src,[good,raspberry,mix,light],market).map(x=>x.code),[good.code]);
});
test('ready-made and powdered tomato soups are separate; generic name is ambiguous',()=>{
 const ready=next('8800000000040',{name:'Tomatsuppe ferdig',brand:'First',ingredients:'Tomat, vann'});
 const ready2=next('8800000000041',{name:'Tomatsuppe serveringsklar',brand:'Second',ingredients:'Tomat, vann'});
 const powder=next('8800000000042',{name:'Tomatsuppe pulver',brand:'Third',ingredients:'Tomatpulver, salt'});
 const unknown=next('8800000000043',{name:'Tomatsuppe',brand:'Fourth',ingredients:'Tomat, vann'});
 assert.equal(productProfile(ready)?.kind,'tomato-soup-ready');
 assert.equal(productProfile(powder)?.kind,'tomato-soup-powder');
 assert.equal(productProfile(unknown),null);
 assert.deepEqual(relevantAlternatives(ready,[ready2,powder,unknown],market).map(x=>x.code),[ready2.code]);
 assert.match(relatedVariantComparisonNote(ready,powder),/målegrunnlag/);
});
test('new category searches use one country-filtered text search without re-ranking nutrition',async()=>{
 const cases=[
   ['Grovbrød', 'grovbrød'],
   ['Loff', 'loff'],
   ['Rugknekkebrød', 'knekkebrød rug'],
   ['Corn Flakes','corn flakes'],
   ['Jordbærsyltetøy','jordbærsyltetøy'],
   ['Tomatsuppe ferdig','tomatsuppe ferdig'],
 ];
 for(const [name,expected] of cases){
   const src=next('8800000000100',{name,brand:'Brand',countries:['en:norway']});
   assert.ok(productProfile(src),name);
   textResults=[];calls.length=0;
   await findAlternatives(src,market);
   assert.equal(calls.length,1);
   assert.equal(calls[0].type,'text');
   assert.equal(calls[0].args[0],expected);
   assert.equal(calls[0].args[1],market);
 }
});


test('photo fallback symbols match the supported product type without inventing a picture',()=>{
 const cases=[
  ['Coca-Cola Zero Sugar','🥤'],['Havregryn','🥣'],
  ['Corn Flakes','🥣'],['Grovbrød','🍞'],['Loff','🍞'],
  ['Rugknekkebrød','🥖'],['Jordbærsyltetøy','🍓'],
  ['Tomatsuppe ferdig','🍲'],['Lettmelk','🥛'],
  ['Ukjent produkt','🍽️']
 ];
 for(const [name,expected] of cases){
  const p=next('9998887776660',{name,brand:'Alternativ',ingredients:undefined});
  assert.equal(fallbackProductIcon(p),expected,name);
 }
});
