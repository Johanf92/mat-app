// Component-handler tests with mocked hooks/network, NOT a device-rendering test.
// Run from mobile: node --test tests/product-alternatives-ui.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../app/product/[id].tsx');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: filename, reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
});
const errors = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
assert.deepEqual(errors, [], 'TSX must parse successfully');
const product = {
  code: '7394376616037', name: 'Example oat drink', brand: 'Example',
  nova: 3, protein: 1, fat: 3, carbs: 7, sugar: 3, energy: 61,
  fiber: 1, salt: 0.1, ingredientLanguage: 'no', ingredients: 'Oats, water',
  additives: [], allergens: [], countries: ['en:norway'], categories: ['en:oat-drinks'], modifiedAt: null,
};
const market = { code: 'no', name: 'Norge', tag: 'en:norway' };
function harness({ supported = true, find = async () => [] } = {}) {
  const state = [];
  let cursor = 0;
  const calls = [], routes = [];
  const jsx = (type, props) => ({ type, props: props || {} });
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = index === 0 ? product : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useEffect() {}, // The source product is injected; effects/device mounting are not tested.
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'expo-router': { useLocalSearchParams: () => ({ id: product.code }), useRouter: () => ({ push: args => routes.push(args), canGoBack: () => false, replace() {} }) },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: x => x } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../src/openFoodFacts': { getProduct: async () => product },
    '../../src/catalog': { amount: n => String(n), NOVA: {}, novaInfo: () => ({ label: 'Example', background: '#fff', foreground: '#000', accent: '#000' }) },
    '../../src/MarketContext': { useMarket: () => ({ market }) },
    '../../src/ui': { colors: {}, InfoSheet: 'InfoSheet', SourceLink: 'SourceLink', NovaBadge: 'NovaBadge' },
    '../../src/additives': { ADDITIVE_GENERAL_SOURCE: '', formatAdditiveCode: x => x, summarizeAdditives: () => ({ title: 'Tilsetningsstoffer', rawTags: [], items: [], unrecognized: [] }) },
    '../../src/alternatives': {
      comparableCategory: () => supported ? 'en:oat-drinks' : null,
      findAlternatives: async (p, m) => { calls.push({ product: p, market: m }); return find(p, m); },
    },
  };
  const mod = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module: mod, exports: mod.exports,
    require(name) { if (!(name in mocks)) throw Error('Unexpected import: ' + name); return mocks[name]; },
  }, { filename });
  return {
    calls, routes,
    render() { cursor = 0; return mod.exports.default(); },
  };
}
function nodes(root) {
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  return [root, ...nodes(root.props?.children)];
}
const byId = (root, id) => nodes(root).find(n => n.props.testID === id);
const text = root => !root ? '' : typeof root === 'string' || typeof root === 'number' ? String(root)
  : Array.isArray(root) ? root.map(text).join(' ') : text(root.props?.children);
const flush = () => new Promise(resolve => setImmediate(resolve));

test('alternatives are above the expandable details', () => {
  const all = nodes(harness().render());
  const panel = all.findIndex(n => n.props.testID === 'product-alternatives');
  const accordion = all.findIndex(n => typeof n.type === 'function' && n.type.name === 'Accordion');
  assert.ok(panel >= 0 && panel < accordion);
});
test('alternatives panel contains no external link', () => {
  const panel = byId(harness().render(), 'product-alternatives');
  assert.equal(nodes(panel).some(n => n.type === 'SourceLink'), false);
  assert.equal(nodes(panel).some(n => 'href' in n.props || 'url' in n.props), false);
});
test('button stays visible with an explanation when category is unsupported', async () => {
  const h = harness({ supported: false });
  const tree = h.render();
  const button = byId(tree, 'find-alternatives');
  assert.equal(button.props.disabled, true);
  assert.match(text(byId(tree, 'product-alternatives')), /Produktkategorien mangler/);
  button.props.onPress(); await flush();
  assert.equal(h.calls.length, 0);
});
test('search calls internal matcher for selected product and market without navigating', async () => {
  const h = harness();
  byId(h.render(), 'find-alternatives').props.onPress();
  await flush();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].product, product);
  assert.equal(h.calls[0].market, market);
  assert.equal(h.routes.length, 0);
  assert.match(text(byId(h.render(), 'product-alternatives')), /Ingen relevante alternativer/);
});
test('idle state does not claim there were no results', () => {
  const panel = byId(harness().render(), 'product-alternatives');
  assert.doesNotMatch(text(panel), /Ingen relevante alternativer/);
  assert.match(text(panel), /Finn alternativer i Matkontroll/);
});
test('pending request shows progress and disables repeat search', async () => {
  let resolve;
  const h = harness({ find: () => new Promise(r => { resolve = r; }) });
  byId(h.render(), 'find-alternatives').props.onPress();
  const pending = h.render();
  assert.equal(byId(pending, 'find-alternatives').props.disabled, true);
  assert.ok(nodes(byId(pending, 'product-alternatives')).some(n => n.type === 'ActivityIndicator'));
  resolve([]); await flush();
  assert.equal(byId(h.render(), 'find-alternatives').props.disabled, false);
});
test('failed search stays in app and shows an error, not empty success', async () => {
  const h = harness({ find: async () => { throw Error('Network unavailable'); } });
  byId(h.render(), 'find-alternatives').props.onPress(); await flush();
  const panel = byId(h.render(), 'product-alternatives');
  assert.match(text(panel), /Kunne ikke hente alternativer/);
  assert.doesNotMatch(text(panel), /Ingen relevante alternativer/);
  assert.equal(h.routes.length, 0);
});
test('result opens another product internally', async () => {
  const other = { ...product, code: '12345678', name: 'Another product' };
  const h = harness({ find: async () => [other] });
  byId(h.render(), 'find-alternatives').props.onPress(); await flush();
  const panel = byId(h.render(), 'product-alternatives');
  const row = nodes(panel).find(n => n.type === 'Pressable' && !n.props.testID && text(n).includes(other.name));
  assert.ok(row);
  row.props.onPress();
  assert.equal(h.routes[0].pathname, '/product/[id]');
  assert.equal(h.routes[0].params.id, other.code);
});
test('only product-source link is explicitly labelled external and inside source accordion', () => {
  const all = nodes(harness().render());
  const links = all.filter(n => n.type === 'SourceLink' && n.props.url === 'https://world.openfoodfacts.org/product/' + product.code);
  assert.equal(links.length, 1);
  assert.match(links[0].props.label, /i nettleseren/);
  const accordion = all.find(n => typeof n.type === 'function' && n.props.title === 'Kilde og datakvalitet');
  assert.ok(nodes(accordion).includes(links[0]));
});
