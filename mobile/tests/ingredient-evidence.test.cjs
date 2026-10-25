const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const sourcePath=path.resolve(__dirname,'../src/ingredientEvidence.ts');
const compile=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
 fileName:sourcePath,reportDiagnostics:true,
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
});
assert.deepEqual((compile.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
const loaded=new Module(sourcePath,module);loaded.filename=sourcePath;
loaded.require=id=>{
 if(id==='./additives')return {
  normalizeAdditive:raw=>{
   const x=raw.trim().replace(/^[a-z]{2}:/i,'').replace(/\s/g,'').toUpperCase();
   return /^E\d{3,4}(?:[A-Z]|\([IVX]+\))?$/.test(x)?x.replace(/\(([IVX]+)\)$/,'$1'):null;
  },
  formatAdditiveCode:code=>code.replace(/^E(\d{3,4})([A-Z])$/,(m,n,c)=>'E'+n+c.toLowerCase())
 };
 throw Error('Unexpected import: '+id);
};
loaded._compile(compile.outputText,sourcePath);
const {displayIngredientText,ingredientCodeEvidence,ingredientCodeNote}=loaded.exports;

test('Open Food Facts underscore emphasis is removed only for rendering',()=>{
 const original='_lettmelk_, yoghurtkultur, _soya_.';
 assert.equal(displayIngredientText(original),'lettmelk, yoghurtkultur, soya.');
 assert.equal(original,'_lettmelk_, yoghurtkultur, _soya_.','original source text is untouched');
 assert.equal(displayIngredientText('gluten_free, x_y_z, E338'),'gluten_free, x_y_z, E338');
 assert.equal(displayIngredientText(undefined),'');
});
test('explicit E-codes in ingredient text are retained independently of tags',()=>{
 const original='Kullsyreholdig vann, sukker, fargestoff (E150d), syre (E338), vitamin E.';
 const evidence=ingredientCodeEvidence(original,[]);
 assert.deepEqual(evidence.mentioned,['E150D','E338']);
 assert.deepEqual(evidence.notInSeparateField,['E150D','E338']);
 const note=ingredientCodeNote(original,[]);
 assert.match(note,/E150d, E338/);
 assert.match(note,/ikke oppført med samme kode/);
 assert.doesNotMatch(note,/inneholder ikke|fri for/);
});
test('case variants and registered tags do not trigger a false mismatch',()=>{
 const original='E150D og E338';
 assert.deepEqual(ingredientCodeEvidence(original,['en:e150d','E338']).notInSeparateField,[]);
 assert.equal(ingredientCodeNote(original,['en:e150d','en:e338']),null);
});
test('explicit Roman variants and spaced identifiers are recognised conservatively',()=>{
 const codes=ingredientCodeEvidence('E 338, E340(ii), E211, vitamin E 150 mg',[]);
 assert.deepEqual(codes.mentioned,['E338','E340II','E211']);
});
test('do not guess additives from chemistry names or ingredient words',()=>{
 const e=ingredientCodeEvidence('Fosforsyre, karbondioksid, karamellfarge, vitamin E',[]);
 assert.deepEqual(e.mentioned,[]);
 assert.equal(ingredientCodeNote(undefined,['en:e338']),null);
});
