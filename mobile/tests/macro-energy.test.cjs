const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const file=path.resolve(__dirname,'../src/macroEnergy.ts');
const source=fs.readFileSync(file,'utf8');
const out=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
const loaded=new Module(file,module);loaded.filename=file;loaded._compile(out.outputText,file);
const {macroEnergy}=loaded.exports;
test('energy percentages use 4/4/9 kcal per gram',()=>{
 const m=macroEnergy(10,20,10);
 assert.ok(m);
 assert.equal(m.total,210);
 assert.ok(Math.abs(m.protein-40/210*100)<1e-8);
 assert.ok(Math.abs(m.carbs-80/210*100)<1e-8);
 assert.ok(Math.abs(m.fat-90/210*100)<1e-8);
});
test('never invent a chart when data is incomplete or impossible',()=>{
 for(const value of [null,NaN,Infinity,-1,101])
  assert.equal(macroEnergy(value,10,10),null);
 assert.equal(macroEnergy(0,0,0),null);
});
test('macro energy fractions sum to 100%',()=>{
 const m=macroEnergy(3.5,12.7,2.1);
 assert.ok(Math.abs(m.protein+m.carbs+m.fat-100)<1e-8);
});

test('rounded percentages add up to 100 even with 101 from naive rounding',()=>{
 const {roundedMacroEnergy}=loaded.exports;
 const m=macroEnergy(12,6.5,19);
 assert.ok(m);
 const rounded=roundedMacroEnergy(m);
 assert.equal(rounded.protein+rounded.carbs+rounded.fat,100);
 assert.deepEqual(rounded,{protein:19,carbs:11,fat:70});
});
