const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
function load(name,mocks={}){
 const filepath=path.resolve(__dirname,'../src/'+name+'.ts');
 const out=ts.transpileModule(fs.readFileSync(filepath,'utf8'),{
  fileName:filepath,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
 });
 assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
 const m=new Module(filepath,module);m.filename=filepath;
 m.require=id=>{if(id in mocks)return mocks[id];throw Error('Unexpected require '+id);};
 m._compile(out.outputText,filepath);
 return m.exports;
}
const additives=load('additives');
const ing=load('ingredientEvidence',{'./additives':additives});
const {productAdditiveEvidence,additiveEvidenceLabel}=load('productEvidence',{
 './additives':additives,'./ingredientEvidence':ing
});
test('explicit ingredient codes are shown even without separate additive tags',()=>{
 const data=productAdditiveEvidence({ingredients:'Vann, fargestoff E150d, emulgator E472e',additives:[]});
 assert.deepEqual(data.items.map(x=>x.code),['E150D','E472E']);
 assert.deepEqual(data.items.map(x=>x.evidence),['ingredients','ingredients']);
 assert.deepEqual(data.ingredientOnlyCodes,['E150D','E472E']);
 assert.match(data.title,/2 oppføringer/);
 assert.match(additiveEvidenceLabel(data.items[0].evidence),/ingredienslisten/);
});
test('source overlap is normalized, not double counted, and raw data retained',()=>{
 const p={ingredients:'Fargestoff (E150D), syre (E338)',additives:['en:e150d','en:e338']};
 const e=productAdditiveEvidence(p);
 assert.deepEqual(e.items.map(x=>x.code),['E150D','E338']);
 assert.deepEqual(e.items.map(x=>x.evidence),['both','both']);
 assert.deepEqual(e.rawTags,p.additives);
 assert.deepEqual(p.additives,['en:e150d','en:e338']);
});
test('family grouping still avoids double counting parent with named child',()=>{
 const r=productAdditiveEvidence({ingredients:'Surhetsregulator E340(ii)',additives:['en:e340','en:e340ii']});
 assert.deepEqual(r.items.map(x=>x.code),['E340II']);
 assert.match(r.groupingNote,/samlegruppe/);
 assert.equal(r.items[0].evidence,'both');
});
test('unknown malformed source tags remain visible without inventing codes',()=>{
 const data=productAdditiveEvidence({ingredients:'Aroma, natriumsitrat, vitamin E 200 mg',additives:['en:unknown','en:e170']});
 assert.deepEqual(data.items.map(x=>x.code),['E170']);
 assert.deepEqual(data.unrecognized,['en:unknown']);
 assert.deepEqual(data.ingredientOnlyCodes,[]);
 assert.equal(data.items[0].evidence,'field');
});
test('product and comparison cannot infer E290 just because source text says kullsyre',()=>{
 const data=productAdditiveEvidence({ingredients:'Kullsyre, fosforsyre',additives:[]});
 assert.equal(data.items.length,0);
 assert.equal(data.title,'Tilsetningsstoffer');
});
