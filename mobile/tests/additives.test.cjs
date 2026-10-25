// Run from mobile: node --test tests/additives.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const sourcePath = path.resolve(__dirname, '../src/additives.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath, reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = module.paths;
loaded._compile(compiled.outputText, sourcePath);
const { normalizeAdditive, formatAdditiveCode, additiveInfo, groupAdditives, summarizeAdditives } = loaded.exports;

test('letter suffix E150d is not silently dropped', () => {
  assert.equal(normalizeAdditive('en:e150d'), 'E150D');
  assert.equal(additiveInfo('en:e150d').name, 'Ammoniumsulfittkaramell');
});
test('Roman subtype formats map to the same key', () => {
  for (const input of ['en:e340ii', 'E340(ii)', ' e 340 ( ii ) ', 'nb:E340II']) {
    assert.equal(normalizeAdditive(input), 'E340II');
    assert.equal(formatAdditiveCode(input), 'E340(ii)');
  }
});
test('letter plus Roman subtype is preserved', () => {
  assert.equal(normalizeAdditive('en:e160ai'), 'E160AI');
  assert.equal(formatAdditiveCode('E160a(i)'), 'E160a(i)');
});
test('four-digit identifiers are supported', () => {
  assert.equal(normalizeAdditive('en:e1422'), 'E1422');
  assert.equal(formatAdditiveCode('E1422'), 'E1422');
});
test('letter suffixes have readable lower-case formatting', () => {
  assert.equal(formatAdditiveCode('E150D'), 'E150d');
  assert.equal(formatAdditiveCode('E407A'), 'E407a');
});
test('malformed codes are not repaired by deleting arbitrary characters', () => {
  for (const input of ['', 'E34', 'E12345', 'E340;ii', 'E340/ii', 'E340(ii', 'E340ii)', 'hello']) {
    assert.equal(normalizeAdditive(input), null, input);
  }
});
test('case and language duplicates are one entry', () => {
  assert.equal(groupAdditives(['en:e290', 'E290', 'no:e290']).length, 1);
});
test('known parent and subtype use one consistent display count', () => {
  const result = summarizeAdditives(['en:e340', 'en:e340ii']);
  assert.deepEqual(result.items.map(x => x.id), ['E340II']);
  assert.equal(result.title, 'Tilsetningsstoffer \u00b7 1 oppf\u00f8ring');
  assert.deepEqual(result.groupedParents, ['E340']);
  assert.match(result.groupingNote, /E340\(ii\)/);
  assert.deepEqual(result.rawTags, ['en:e340', 'en:e340ii']);
});
test('two specific variants remain two entries', () => {
  const result = summarizeAdditives(['en:e340', 'en:e340i', 'en:e340ii']);
  assert.deepEqual(result.items.map(x => x.id), ['E340I', 'E340II']);
  assert.equal(result.title, 'Tilsetningsstoffer \u00b7 2 oppf\u00f8ringer');
});
test('a parent on its own remains visible', () => {
  const result = summarizeAdditives(['en:e340']);
  assert.equal(result.items[0].id, 'E340');
  assert.equal(result.groupingNote, null);
});
test('shared numeric prefixes alone do not imply a family relationship', () => {
  assert.equal(groupAdditives(['E340', 'E3400']).length, 2);
  assert.equal(groupAdditives(['E150', 'E150d']).length, 2);
});
test('syntactically valid code without a description stays visible', () => {
  const result = summarizeAdditives(['en:e999']);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, 'Forklaring mangler');
});
test('unrecognised raw records are preserved and counted separately', () => {
  const result = summarizeAdditives(['en:e340', 'en:e340ii', 'en:unmapped-additive']);
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.unrecognized, ['en:unmapped-additive']);
  assert.equal(result.title, 'Tilsetningsstoffer \u00b7 2 oppf\u00f8ringer');
});
test('Coca-Cola example retains all three supplied additive codes', () => {
  assert.deepEqual(groupAdditives(['en:e150d', 'en:e290', 'en:e338']).map(x => x.id), ['E150D', 'E290', 'E338']);
});
test('empty input does not claim that a product has zero additives', () => {
  const result = summarizeAdditives([' ', '']);
  assert.equal(result.title, 'Tilsetningsstoffer');
  assert.equal(result.groupingNote, null);
  assert.deepEqual(result.items, []);
});
test('input array is not mutated and raw values remain available', () => {
  const values = Object.freeze(['en:e340', 'en:e340ii']);
  const result = summarizeAdditives(values);
  assert.deepEqual(values, ['en:e340', 'en:e340ii']);
  assert.deepEqual(result.rawTags, values);
});
