/**
 * Offline regression corpus inspired by ordinary Norwegian supermarket
 * categories. These are SYNTHETIC source records, not verified packaging
 * declarations for named brands or a live Open Food Facts audit.
 * Tests protect missing-data semantics when the source varies by category.
 */
const { test } = require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matkontroll-coverage-'));
for(const name of ['catalog','nutriScore','openFoodFacts','productDataStatus']){
 const source=path.resolve(__dirname,'../src/'+name+'.ts');
 const result=ts.transpileModule(fs.readFileSync(source,'utf8'),{
  fileName:source,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  reportDiagnostics:true
 });
 assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 fs.writeFileSync(path.join(dir,name+'.js'),result.outputText);
}
process.on('exit',()=>fs.rmSync(dir,{recursive:true,force:true}));
const {normalize,searchResults}=require(path.join(dir,'openFoodFacts.js'));
const {productDataStatus}=require(path.join(dir,'productDataStatus.js'));
const norway=['en:norway'];
const records=[
 {
  label:'vanlig cola',raw:{code:'9800000000001',product_name_no:'Cola original',
   nova_group:4,ingredients_text_no:'Vann, sukker, fargestoff (E150d)',
   nutriments:{'energy-kcal_100g':42,proteins_100g:0,fat_100g:0,
    carbohydrates_100g:10.6,sugars_100g:10.6,salt_100g:0}},
  checks:p=>{assert.equal(p.sugar,10.6);assert.equal(p.fiber,null);assert.equal(p.nova,4);}
 },
 {
  label:'sukkerfri cola',raw:{code:'9800000000002',product_name:'Zero Cola',nova_group:4,
   ingredients_text:'Vann, søtstoff (E950)',nutriscore_grade:'unknown',
   nutriments:{'energy-kcal_100g':0.3,sugars_100g:0,carbohydrates_100g:0,
    fat_100g:0,proteins_100g:0,salt_100g:0.02}},
  checks:p=>{assert.equal(p.sugar,0);assert.equal(p.nutriScore,null);
   assert.equal(productDataStatus(p).observedNutrients,6);}
 },
 {
  label:'havredrikk',raw:{code:'9800000000003',product_name_no:'Havredrikk barista',
   image_front_url:'https://example.invalid/havredrikk.jpg',ingredients_text_no:'Vann, havre, olje',
   nova_group:3,nutriscore_grade:'d',nutriments:{energy_100g:251,proteins_100g:1,
    fat_100g:3,carbohydrates_100g:7,sugars_100g:3,salt_100g:0.1}},
  checks:p=>{assert.equal(p.energyConvertedFromKJ,true);assert.equal(p.energy,60);
   assert.equal(p.nutriScore,'d');assert.match(productDataStatus(p).notes.join(' '),/regnet om/);}
 },
 {
  label:'kefir naturell',raw:{code:'9800000000004',product_name_no:'Kefir naturell',
   ingredients_text_no:'Melk, kefirkultur',
   nutriments:{'energy-kcal_100g':57,proteins_100g:3.3,fat_100g:3,
    carbohydrates_100g:4.2,sugars_100g:4.2,salt_100g:0.1}},
  checks:p=>{assert.equal(p.nova,null);assert.equal(p.ingredients,'Melk, kefirkultur');
   assert.match(productDataStatus(p).notes.join(' '),/NOVA/);}
 },
 {
  label:'gresk naturell yoghurt',raw:{code:'9800000000005',product_name_no:'Gresk yoghurt naturell',
   ingredients_text_no:'Lettmelk, yoghurtkultur',allergens_tags:['en:milk','no:lettmelk'],
   nutriments:{proteins_100g:8.5,fat_100g:2,carbohydrates_100g:3.3,sugars_100g:3.3,salt_100g:0.1}},
  checks:p=>{assert.equal(p.energy,null);assert.deepEqual(p.additives,[]);
   assert.deepEqual(p.allergens,['en:milk','no:lettmelk']);
   assert.ok(productDataStatus(p).notes.some(x=>x.includes('energi')));}
 },
 {
  label:'grovbrød',raw:{code:'9800000000006',product_name_no:'Grovbrød',
   ingredients_text_no:'Hvetemel, sammalt rug, vann, emulgator E472e',
   nutriments:{'energy-kcal_100g':210,proteins_100g:9,fat_100g:2.5,
    carbohydrates_100g:37,sugars_100g:3,fiber_100g:6,salt_100g:1.2}},
  checks:p=>{assert.equal(p.fiber,6);assert.equal(p.ingredients.includes('E472e'),true);
   assert.deepEqual(p.additives,[],'missing separate field is not inferred from ingredients');}
 },
 {
  label:'havregryn',raw:{code:'9800000000007',product_name_no:'Havregryn',
   ingredients_text_no:'Havregryn',
   nutriments:{'energy-kcal_100g':370,proteins_100g:12,fat_100g:6,
    carbohydrates_100g:60,sugars_100g:1,fiber_100g:9,salt_100g:0}},
  checks:p=>{assert.equal(p.salt,0);assert.equal(p.sugar,1);
   assert.equal(productDataStatus(p).issues.length,0);}
 },
 {
  label:'jordbærsyltetøy',raw:{code:'9800000000008',product_name_no:'Jordbærsyltetøy',
   ingredients_text_no:'Jordbær, sukker, pektin',
   nutriments:{'energy-kcal_100g':160,proteins_100g:0.3,fat_100g:0,
    carbohydrates_100g:40,sugars_100g:38,salt_100g:0}},
  checks:p=>{assert.equal(p.sugar,38);assert.equal(p.nova,null);
   assert.equal(productDataStatus(p).issues.length,0);}
 },
 {
  label:'pulver til tomatsuppe',raw:{code:'9800000000009',product_name_no:'Tomatsuppe pulver',
   ingredients_text_no:'Tomatpulver, salt, sukker',
   nutriments:{energy_100g:1200, 'energy-kcal_prepared_100g':25,
    proteins_100g:6,fat_100g:3,carbohydrates_100g:55,sugars_100g:14,salt_100g:8}},
  checks:p=>{assert.equal(p.energyConvertedFromKJ,true);assert.equal(p.energy,286.8);
   assert.notEqual(p.energy,25,'prepared soup values must never replace product as sold');}
 },
 {
  label:'ufullstendig produktoppføring',raw:{code:'9800000000010',product_name_no:'Matvare med mangler',
   nutriments:{'energy-kcal_100g':null,proteins_100g:'',fat_100g:-1,sugars_100g:null}},
  checks:p=>{assert.equal(p.energy,null);assert.equal(p.protein,null);assert.equal(p.fat,null);
   assert.equal(p.nova,null);assert.equal(p.nutriScore,null);
   assert.equal(productDataStatus(p).summaryNotice!==null,true);}
 },
];
test('ten supermarket-category fixtures retain source facts without manufacturing missing fields',()=>{
 for(const scenario of records){
  const raw={countries_tags:norway,...scenario.raw};
  const product=normalize(raw);
  assert.ok(product,scenario.label);
  assert.equal(product.code,scenario.raw.code);
  assert.ok(product.ingredients===undefined||typeof product.ingredients==='string');
  scenario.checks(product);
  assert.equal(productDataStatus(product).nutrientFields,7);
  assert.ok(productDataStatus(product).issues.every(s=>!/sunnere|sunnest|farlig/.test(s)));
 }
});
test('identical-barcode grocery hits do not leak values between different source records',()=>{
 const sparse={countries_tags:norway,code:'9800000000010',product_name_no:'Matvare',
   nutriments:{proteins_100g:0}};
 const rich={countries_tags:norway,code:'9800000000010',product_name_no:'Matvare',
   ingredients_text_no:'Vann, havre',
   nutriments:{proteins_100g:1,fat_100g:2,carbohydrates_100g:6,sugars_100g:0}};
 const [chosen]=searchResults({hits:[sparse,rich]},{code:'no',name:'Norge',tag:'en:norway'});
 assert.equal(chosen.ingredients,'Vann, havre');
 assert.equal(chosen.protein,1);
 assert.equal(chosen.salt,null,'never invent or merge missing value');
});

test('duplicate barcodes prefer plausible source values over impossible mass claims',()=>{
 const code='9800000000099';
 const impossible={code,countries_tags:norway,product_name_no:'Testmat',
  ingredients_text_no:'Melk',nutriments:{proteins_100g:3,fat_100g:3,
    carbohydrates_100g:130,sugars_100g:120,salt_100g:0.1}};
 const plausible={code,countries_tags:norway,product_name_no:'Testmat',
  ingredients_text_no:'Melk',nutriments:{proteins_100g:3,fat_100g:3,
    carbohydrates_100g:5,sugars_100g:4}};
 const [chosen]=searchResults({hits:[impossible,plausible]},{code:'no',name:'Norge',tag:'en:norway'});
 assert.equal(chosen.carbs,5);
 assert.equal(chosen.sugar,4);
 assert.equal(productDataStatus(normalize(impossible)).issues.length,2);
});
