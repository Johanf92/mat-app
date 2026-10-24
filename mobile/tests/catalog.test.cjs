/* Run: node tests/catalog.test.cjs (uses the project's existing TypeScript dependency).
   Pure data tests, not native UI tests. No real API calls are made. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'matkontroll-tests-'));
for (const name of ['catalog', 'openFoodFacts']) {
  const source = fs.readFileSync(path.join(__dirname, '../src', name + '.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal((compiled.diagnostics ?? []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0);
  fs.writeFileSync(path.join(folder, name + '.js'), compiled.outputText);
}
process.on('exit', () => fs.rmSync(folder, { recursive: true, force: true }));
const { DEFAULT_MARKET, MARKETS, numeric, readableText, novaInfo, amount, flag } = require(path.join(folder, 'catalog.js'));
const { normalize, buildSearchUrl, buildProductUrl, searchProducts, getProduct } = require(path.join(folder, 'openFoodFacts.js'));
const base = { code: '7310867104494', product_name: 'Test', countries_tags: ['en:norway'] };

test('Norway is default; market and language stay separate', () => {
  assert.equal(DEFAULT_MARKET.code, 'no');
  const u = new URL(buildSearchUrl('gresk yoghurt', DEFAULT_MARKET));
  assert.equal(u.searchParams.get('tagtype_0'), 'countries');
  assert.equal(u.searchParams.get('tag_0'), 'en:norway');
  assert.equal(u.searchParams.get('search_terms'), 'gresk yoghurt');
  assert.equal(u.searchParams.has('lc'), false);
});
test('country changes the filter; worldwide deliberately has no filter', () => {
  const es = MARKETS.find(m => m.code === 'es');
  assert.equal(new URL(buildSearchUrl('yogur', es)).searchParams.get('tag_0'), 'en:spain');
  const world = MARKETS.find(m => m.code === 'world');
  assert.equal(new URL(buildSearchUrl('yoghurt', world)).searchParams.has('tagtype_0'), false);
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
    return { ok: true, status: 200, json: async () => ({ products: [base, { ...base, code: '5449000054227', countries_tags: ['en:spain'] }, { ...base, code: '3017620422003', countries_tags: [] }] }) };
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
