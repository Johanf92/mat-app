const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const sourcePath = path.resolve(__dirname, '../src/ingredientTerms.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  fileName: sourcePath, reportDiagnostics: true,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded._compile(compiled.outputText, sourcePath);
const { ingredientTerms } = loaded.exports;

test('aroma in ingredient text has a source-backed explanation, not an E-number', () => {
  for (const phrase of ['Aroma', 'Naturlige aromaer', 'aromastoffer', 'melk, aroma, jordbær']) {
    const terms = ingredientTerms(phrase);
    assert.equal(terms.length, 1, phrase);
    assert.equal(terms[0].name, 'Aroma');
    assert.match(terms[0].source, /mattilsynet\.no/);
    assert.match(terms[0].description, /ikke ett bestemt E-nummer/);
    assert.doesNotMatch(terms[0].description, /farlig eller trygt|helseskadelig\./);
  }
});
test('aroma is not invented for unrelated texts or a fragment of another word', () => {
  for (const phrase of [undefined, '', 'melk, kefirkultur', 'koffeinaroma', 'røykaroma', 'kakaopulver']) {
    assert.deepEqual(ingredientTerms(phrase), []);
  }
});


test('general ingredient function words have sourced definitions without adding E-numbers',()=>{
 const words='aroma, emulgator, fortykningsmiddel, stabilisator, konserveringsmiddel, surhetsregulerende middel, søtstoffer';
 const matched=ingredientTerms(words);
 assert.deepEqual(matched.map(x=>x.id),[
  'aroma','emulgator','fortykningsmiddel','stabilisator','konserveringsmiddel','surhetsregulerende','sotstoff',
 ]);
 for(const term of matched){
   assert.match(term.source,/mattilsynet\.no/);
   assert.ok(term.description.length>45);
   assert.doesNotMatch(term.description,/dokumentert farlig|sikkert sunt/);
 }
});
test('ingredients terms are matched as actual words, not fragments in brand or other words',()=>{
 assert.deepEqual(ingredientTerms('koffeinaroma, stabilisatorisk, konserveringsmiddelaktig, emulgatorisk'),[]);
 assert.deepEqual(ingredientTerms('Melk, kefirkultur, melkesyre'),[]);
 assert.deepEqual(ingredientTerms(undefined),[]);
});
test('same source term is only explained once if repeated',()=>{
 const terms=ingredientTerms('Emulgator, emulgator (E472b), emulgator.');
 assert.deepEqual(terms.map(x=>x.id),['emulgator']);
});


test('common bakery function names are shown as functions, not invented E-numbers',()=>{
 const items=ingredientTerms('Antioksidant, fargestoff, hevemiddel');
 assert.deepEqual(items.map(x=>x.id),['antioksidant','fargestoff','hevemiddel']);
 for(const item of items){assert.match(item.source,/mattilsynet\.no/);assert.match(item.category,/Funksjon/);}
 assert.deepEqual(ingredientTerms('antioksidantisk, fargestoffaktig, hevemiddelaktig'),[]);
});
