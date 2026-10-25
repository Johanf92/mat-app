const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const sourcePath=path.resolve(__dirname,'../src/productDataStatus.ts');
const out=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
  fileName:sourcePath,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
  reportDiagnostics:true,
});
assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const mod=new Module(sourcePath,module);
mod.filename=sourcePath;
mod._compile(out.outputText,sourcePath);
const {productDataStatus}=mod.exports;
const base={code:'11111111',name:'Test',brand:'Local',
 ingredients:'Melk, kultur',nova:1,energy:55,protein:3.5,fat:3,carbs:4,
 sugar:4,fiber:null,salt:0.1,additives:[],allergens:[],categories:[],countries:['en:norway']};
test('recorded zero counts as reported data; null counts as unknown',()=>{
 const data=productDataStatus({...base,protein:0,sugar:0,carbs:0});
 assert.equal(data.observedNutrients,6);
 assert.equal(data.nutrientFields,7);
 assert.match(data.headline,/6 av 7/);
 assert.deepEqual(data.notes,[]);
});
test('missing NOVA or ingredients are reported, not inferred',()=>{
 const data=productDataStatus({...base,ingredients:undefined,nova:null,
  energy:null,protein:null,carbs:null,sugar:null});
 assert.match(data.headline,/ingredienser mangler/);
 assert.match(data.headline,/NOVA mangler/);
 assert.ok(data.notes.some(x=>/Ingredienslisten mangler/.test(x)));
 assert.ok(data.notes.some(x=>/Flere næringsverdier/.test(x)));
});
test('obvious internal contradictions are signalled cautiously',()=>{
 const data=productDataStatus({...base,energy:0,sugar:10,carbs:8});
 assert.ok(data.notes.some(x=>/Sukkerarter/.test(x)));
 assert.ok(data.notes.some(x=>/Energien står som 0 kcal/.test(x)));
 assert.ok(data.notes.every(x=>!/(farlig|sunnest)/.test(x)));
});
test('a normal unknown energy value is not treated as zero calories',()=>{
 const data=productDataStatus({...base,energy:null,protein:0,carbs:0,fat:0});
 assert.equal(data.observedNutrients,5);
 assert.ok(!data.notes.some(x=>/Energien står som 0/.test(x)));
});
