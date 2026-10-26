/* Run: node tests/catalog.test.cjs (uses the project's existing TypeScript dependency).
   Pure data tests, not native UI tests. No real API calls are made. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'matkontroll-tests-'));
for (const name of ['catalog', 'nutriScore', 'openFoodFacts']) {
  const source = fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal((compiled.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  fs.writeFileSync(path.join(folder, name + '.js'), compiled.outputText);
}
process.on('exit', () => fs.rmSync(folder, { recursive: true, force: true }));
const { DEFAULT_MARKET, MARKETS, numeric, readableText, novaInfo, amount, flag } = require(path.join(folder, 'catalog.js'));
const { normalize, buildSearchUrl, buildCategoryUrl, buildProductUrl, searchProducts, getProduct, searchResults, searchByCategory } = require(path.join(folder, 'openFoodFacts.js'));
const base = { code: '7310867104494', product_name: 'Test', countries_tags: ['en:norway'] };

test('Norway is default; full-text search uses Search-a-licious with a country filter', () => {
  assert.equal(DEFAULT_MARKET.code, 'no');
  const u = new URL(buildSearchUrl('gresk yoghurt', DEFAULT_MARKET));
  assert.equal(u.hostname, 'search.openfoodfacts.org');
  assert.equal(u.pathname, '/search');
  assert.equal(u.searchParams.get('q'), 'gresk yoghurt countries_tags:"en:norway"');
  assert.equal(u.searchParams.get('langs'), 'no,en');
  assert.ok(u.searchParams.get('fields').includes('nutriments'));
  assert.ok(u.searchParams.get('fields').includes('nutriscore_grade'));
  assert.ok(u.searchParams.get('fields').includes('image_front_small_url'));
  assert.ok(u.searchParams.get('fields').includes('ingredients_text_nb'));
  assert.ok(u.searchParams.get('fields').includes('additives_tags'));
});
test('country changes the filter; worldwide deliberately has no filter', () => {
  const es = MARKETS.find(m => m.code === 'es');
  assert.equal(new URL(buildSearchUrl('yogur', es)).searchParams.get('q'), 'yogur countries_tags:"en:spain"');
  const world = MARKETS.find(m => m.code === 'world');
  assert.equal(new URL(buildSearchUrl('yoghurt', world)).searchParams.get('q'), 'yoghurt');
  assert.equal(new URL(buildSearchUrl('Coca-Cola', DEFAULT_MARKET)).searchParams.get('q'), 'Coca Cola countries_tags:"en:norway"');
});
test('category search uses Search-a-licious clauses rather than the broken v2 endpoint', () => {
  const url = new URL(buildCategoryUrl('en:oat-drinks', DEFAULT_MARKET));
  assert.equal(url.hostname, 'search.openfoodfacts.org');
  assert.equal(url.pathname, '/search');
  assert.equal(url.searchParams.get('q'), 'categories_tags:"en:oat-drinks" countries_tags:"en:norway"');
  assert.equal(url.searchParams.get('page_size'), '60');
  const all = new URL(buildCategoryUrl('en:greek-yogurts', MARKETS.find(m => m.code === 'world')));
  assert.equal(all.searchParams.get('q'), 'categories_tags:"en:greek-yogurts"');
});
test('barcodes are always global and do not leak a country into the URL', () => {
  const u = new URL(buildProductUrl(base.code));
  assert.equal(u.hostname, 'world.openfoodfacts.org');
  assert.equal(u.searchParams.has('tag_0'), false);
  assert.equal(u.searchParams.has('cc'), false);
});
test('missing, blank and invalid nutrients remain null; zero is real data', () => {
  for (const v of [null, undefined, '', ' ', true, false, [], {}, 'abc', '-2', Infinity, NaN]) assert.equal(numeric(v), null);
  assert.equal(numeric(0), 0); assert.equal(numeric('0'), 0); assert.equal(numeric('4,6'), 4.6);
  const p = normalize({ ...base, nutriments: { proteins_100g: '4.6', sugars_100g: '', salt_100g: 0, fat_100g: 10, carbohydrates_100g: '3' } });
  assert.equal(p.protein, 4.6); assert.equal(p.sugar, null); assert.equal(p.salt, 0); assert.equal(p.fiber, null);
  assert.equal(p.fat, 10); assert.equal(p.carbs, 3);
});
test('NOVA handles strings but never guesses missing or invalid values', () => {
  assert.equal(normalize({ ...base, nova_group: '4' }).nova, 4);
  for (const nova_group of [undefined, null, 0, 5, 1.5, '', 'junk']) assert.equal(normalize({ ...base, nova_group }).nova, null);
  assert.equal(novaInfo(null).label, 'Ikke klassifisert');
  assert.equal(new Set([1, 2, 3, 4].map(g => novaInfo(g).background)).size, 4);
});
test('formatting cleanup preserves the original ingredient text', () => {
  const original = 'Melk &quot;naturell&quot; &amp; kultur &#248;';
  const p = normalize({ ...base, ingredients_text: original, lang: 'sv' });
  assert.equal(p.ingredientsOriginal, original);
  assert.equal(p.ingredients, 'Melk "naturell" & kultur ø');
  assert.equal(p.ingredientLanguage, 'sv');
  assert.equal(readableText('A &unknown; B'), 'A &unknown; B');
});
test('norwegian field is preferred without pretending to translate foreign content', () => {
  const p = normalize({ ...base, product_name_no: 'Norsk navn', ingredients_text_no: 'Melk', ingredients_text: 'Milk', lang: 'en' });
  assert.equal(p.name, 'Norsk navn'); assert.equal(p.ingredients, 'Melk'); assert.equal(p.ingredientLanguage, 'no');
});
test('missing tags are not converted into absence claims', () => {
  const p = normalize(base);
  assert.deepEqual(p.additives, []); assert.deepEqual(p.allergens, []);
  assert.equal(p.ingredients, undefined);
});
test('formatting keeps low salt visible and labels absent values', () => {
  assert.equal(amount(0.01), '0,01 g'); assert.equal(amount(null), 'Ikke oppgitt');
  assert.equal(flag('no').length, 4);
});
test('malformed product is rejected, but an otherwise valid nameless product is retained', () => {
  assert.equal(normalize(null), null); assert.equal(normalize({ code: 'oops' }), null);
  assert.equal(normalize({ code: base.code }).name, 'Produktnavn mangler');
});
test('request behavior: country guard, cache separation, global barcode, HTTP errors, cancellation', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ hits: [base, { ...base, code: '5449000054227', countries_tags: ['en:spain'] }, { ...base, code: '3017620422003', countries_tags: [] }] }) };
  };
  try {
    const norway = await searchProducts('country-test', DEFAULT_MARKET);
    assert.deepEqual(norway.map(p => p.code), [base.code]);
    await searchProducts('country-test', DEFAULT_MARKET);
    assert.equal(calls.length, 1, 'repeat query should hit cache');
    const spain = await searchProducts('country-test', MARKETS.find(m => m.code === 'es'));
    assert.deepEqual(spain.map(p => p.code), ['5449000054227']);
    assert.equal(calls.length, 2);
    const world = await searchProducts('country-test', MARKETS.find(m => m.code === 'world'));
    assert.equal(world.length, 3); assert.equal(calls.length, 3);
    assert.match(calls[0].options.headers['User-Agent'], /Matkontroll/);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ status: 1, product: { product_name: 'Global item' } }) });
    const globalProduct = await getProduct(base.code);
    assert.equal(globalProduct.code, base.code);
    assert.equal(await getProduct('not-a-code'), null);
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(searchProducts('rate-error-test', DEFAULT_MARKET), /vente/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(searchProducts('abort-test', DEFAULT_MARKET, controller.signal), /Avbrutt/);
    global.fetch = async () => ({ ok: false, status: 404 });
    assert.equal(await getProduct('9999999999999'), null);
  } finally { global.fetch = originalFetch; }
});

test('barcode details never accept another product identity', async () => {
 const originalFetch=global.fetch;
 try {
  global.fetch=async()=>({ok:true,status:200,json:async()=>({
    status:1,product:{code:'1234567890123',product_name:'Unrelated product'}
  })});
  assert.equal(await getProduct('1111111111111'),null,
   'a wrong barcode in an upstream detail response must not be displayed');
  global.fetch=async()=>({ok:true,status:200,json:async()=>({
    status:1,product:{product_name:'Valid record without code',ingredients_text:'Melk'}
  })});
  const matching=await getProduct('2222222222222');
  assert.equal(matching.code,'2222222222222');
  assert.equal(matching.ingredients,'Melk');
 } finally {global.fetch=originalFetch;}
});

test('Search-a-licious hits are normalised and strictly filtered by country', () => {
 const product = { ...base, categories_tags: ['en:oat-drinks'], brands: 'Test brand',
   nutriments: { proteins_100g: 3.4, sugars_100g: 0 } };
 const selected = searchResults({ hits: [product, { ...product, code: '5449000054227', countries_tags: ['en:spain'] }] }, DEFAULT_MARKET);
 assert.equal(selected.length, 1);
 assert.equal(selected[0].code, base.code);
 assert.equal(selected[0].protein, 3.4);
 assert.equal(selected[0].sugar, 0);
 assert.deepEqual(searchResults({ hits: [product] }, MARKETS.find(m => m.code === 'world')).map(p=>p.code), [base.code]);
 assert.throws(() => searchResults({ products: [product] }, DEFAULT_MARKET), /uventet svar/);
});
test('search normaliser works for language objects and brand arrays in search hits', () => {
 const product = normalize({ ...base, product_name: { no: 'Norsk navn', en: 'English name' }, brands: ['Merke A','Merke B'] });
 assert.equal(product.name, 'Norsk navn');
 assert.equal(product.brand, 'Merke A');
});


test('Nutri-Score parsing only accepts A-E and never infers grades from NOVA or nutrients',()=>{
 const withGrade=normalize({...base,nova_group:4,nutriscore_grade:'b'});
 assert.equal(withGrade.nutriScore,'b');
 assert.equal(withGrade.nova,4);
 assert.equal(normalize({...base,nutriscore_grade:' C '}).nutriScore,'c');
 assert.equal(normalize({...base,nutrition_grades:'a'}).nutriScore,'a');
 assert.equal(normalize({...base, nutrition_grade_fr:'d'}).nutriScore,'d');
 for(const value of ['not-applicable','unknown','',null,undefined,0,5,'f','easier']){
  assert.equal(normalize({...base,nutriscore_grade:value,nutrition_grades:value}).nutriScore,null);
 }
 assert.equal(normalize({...base,nutriscore_grade:'unknown',nutrition_grades:'b'}).nutriScore,null,
  'newer explicit unknown cannot be overridden by old legacy score');
 const u=new URL(buildProductUrl(base.code));
 assert.ok(u.searchParams.get('fields').includes('nutriscore_grade'));
 assert.ok(u.searchParams.get('fields').includes('nutrition_grades'));
});


test('kJ-only energy is converted transparently, without overriding explicit kcal including zero',()=>{
 const fromKJ=normalize({...base,nutriments:{energy_100g:176,proteins_100g:0}});
 assert.equal(fromKJ.energy,42.1);
 assert.equal(fromKJ.energyConvertedFromKJ,true);
 assert.equal(fromKJ.energyKJConflict,false);
 const authoritative=normalize({...base,nutriments:{'energy-kcal_100g':42,energy_100g:176}});
 assert.equal(authoritative.energy,42);
 assert.equal(authoritative.energyConvertedFromKJ,false);
 assert.equal(authoritative.energyKJConflict,false);
 const conflict=normalize({...base,nutriments:{'energy-kcal_100g':0,energy_100g:1000}});
 assert.equal(conflict.energy,0);
 assert.equal(conflict.energyConvertedFromKJ,false);
 assert.equal(conflict.energyKJConflict,true);
 const missing=normalize({...base,nutriments:{energy_100g:'missing','energy-kcal_100g':-1}});
 assert.equal(missing.energy,null);
 assert.equal(missing.energyConvertedFromKJ,false);
});
test('duplicates of the same barcode prefer a complete consistent record, preserving stable result order',()=>{
 const code=base.code,other='1234567890123';
 const first={...base,product_name:'Original',nutriments:{sugars_100g:0}};
 const weak={...base,product_name:'Only name',code:other};
 const complete={...base,product_name:'Full record',ingredients_text_no:'Melk, kultur',
  image_front_url:'https://example.invalid/image.jpg',nutriscore_grade:'b',nova_group:1,
  nutriments:{'energy-kcal_100g':55,proteins_100g:4,fat_100g:2,carbohydrates_100g:4,sugars_100g:4,salt_100g:0.1}};
 const duplicate={...complete,code,product_name:'Full record'};
 const rows=searchResults({hits:[first,weak,duplicate]},DEFAULT_MARKET);
 assert.deepEqual(rows.map(x=>x.code),[code,other]);
 assert.equal(rows[0].name,'Full record');
 assert.equal(rows[0].ingredients,'Melk, kultur');
 assert.equal(rows[0].nova,1);
 assert.equal(rows[0].sugar,4);
 assert.equal(rows[1].name,'Only name');
 assert.equal(searchResults({hits:[duplicate,first]},DEFAULT_MARKET)[0].name,'Full record');
});
test('conflicting complete record never wins only because it appears last, and records are not merged',()=>{
 const inconsistent={...base,product_name:'Bad numbers',ingredients_text:'Vann, sukker',
  nutriments:{'energy-kcal_100g':0,proteins_100g:8,fat_100g:4,carbohydrates_100g:1,sugars_100g:30}};
 const consistent={...base,product_name:'Less complete',
  nutriments:{proteins_100g:0,carbohydrates_100g:10.6,sugars_100g:10.6}};
 const product=searchResults({hits:[consistent,inconsistent]},DEFAULT_MARKET)[0];
 assert.equal(product.name,'Less complete');
 assert.equal(product.fat,null,'never merge fat from the conflicting record');
 assert.equal(product.sugar,10.6);
});
test('duplicate selection obeys selected country even if another hit has richer data',()=>{
 const otherMarket={...base,countries_tags:['en:sweden'],ingredients_text:'Melk',nova_group:1,
  nutriments:{proteins_100g:3,fat_100g:3,carbohydrates_100g:4,sugars_100g:4}};
 const norway={...base,product_name:'Norway version'};
 const selected=searchResults({hits:[otherMarket,norway]},DEFAULT_MARKET);
 assert.equal(selected.length,1);
 assert.equal(selected[0].name,'Norway version');
});

test('search ordering prefers exact named food over ingredients-only or broad keyword matches',()=>{
 const {rankProductSearch}=require(path.join(folder,'openFoodFacts.js'));
 const products=[
  {name:'Blueberries',brand:'Tomat og makrell ingredienser'},
  {name:'Tomater',brand:'Grønnsaker'},
  {name:'Makrell i tomat hel filet',brand:'Stabburet'},
  {name:'Makrellfilet i tomatsaus',brand:'Sjømat'},
 ];
 const ranked=rankProductSearch('makrell i tomat',products);
 assert.equal(ranked[0].name,'Makrell i tomat hel filet');
 assert.equal(ranked[ranked.length-1].name,'Blueberries');
 assert.ok(ranked.findIndex(p=>p.name==='Tomater')>0);
 assert.equal(products[0].name,'Blueberries','source records remain unchanged');
});
test('search ordering remains stable when names cannot be matched',()=>{
 const {rankProductSearch}=require(path.join(folder,'openFoodFacts.js'));
 const x=[{name:'Eple',brand:'A'},{name:'Pære',brand:'B'}];
 assert.deepEqual(rankProductSearch('makrell i tomat',x),x);
});
