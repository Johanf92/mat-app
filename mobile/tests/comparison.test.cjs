const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const sourcePath=path.resolve(__dirname,'../src/comparison.ts');
const compiled=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
 fileName:sourcePath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true
});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const loaded=new Module(sourcePath,module);loaded.filename=sourcePath;
loaded.require=id=>{
 if(id==='./catalog')return {amount:(n,unit='g')=>n===null?'Ikke oppgitt':n.toLocaleString('nb-NO',{maximumFractionDigits:2})+' '+unit};
 throw Error('Unexpected dependency: '+id);
};
loaded._compile(compiled.outputText,sourcePath);
const {comparisonInsight,metricAmount,METRICS,COMPARE_OPTIONS,comparisonDataWarnings}=loaded.exports;
const a={name:'Naturell yoghurt A',nova:1,ingredients:'Melk, kultur',protein:10,sugar:4,fat:3,carbs:5,energy:90,salt:0.1,fiber:0};
const b={...a,name:'Naturell yoghurt B',nova:4,protein:8,carbs:12,sugar:11,ingredients:'Melk, sukker, kultur',energy:110};

test('NOVA differences describe processing without naming a healthier winner',()=>{
 const msg=comparisonInsight(a,b,'processing');
 assert.match(msg,/NOVA 1/);assert.match(msg,/NOVA 4/);
 assert.doesNotMatch(msg,/sunnere|bedre|verst/);
});
test('missing NOVA is unknown, never zero',()=>{
 assert.match(comparisonInsight({...a,nova:null},b,'processing'),/mangler/);
});
test('protein comparison points out amount but makes no health claim',()=>{
 const msg=comparisonInsight(a,b,'protein');
 assert.match(msg,/Naturell yoghurt A/);assert.match(msg,/2 g mer protein/);
});
test('sugar comparison distinguishes total from added sugar',()=>{
 const msg=comparisonInsight(a,b,'sugar');
 assert.match(msg,/7 g mer sukkerarter/);
 assert.match(msg,/naturlig forekommende/);
});
test('missing macro remains explicitly unknown',()=>{
 assert.match(comparisonInsight({...a,protein:null},b,'protein'),/mangler/);
 assert.equal(metricAmount({...a,fiber:null},'fiber'),'Ikke oppgitt');
});
test('ingredient text is never naively split into an invented ingredient count',()=>{
 assert.match(comparisonInsight(a,b,'ingredients'),/teller ikke ingredienser/);
 assert.match(comparisonInsight({...a,ingredients:undefined},b,'ingredients'),/mangler/);
});
test('all seven macros are presented and focus options are independent',()=>{
 assert.deepEqual(METRICS.map(x=>x.key),['energy','protein','fat','carbs','sugar','fiber','salt']);
 assert.deepEqual(COMPARE_OPTIONS.map(x=>x.key),['processing','ingredients','protein','sugar']);
});

test('different NOVA groups are not explained away using macros', () => {
 const message=comparisonInsight(a,b,'processing');
 assert.match(message,/ikke fastslå hvorfor/);
 assert.match(message,/næringstallene/);
});
test('impossible sugar values warn without inventing ingredient information',()=>{
 const suspect={...a,sugar:12,carbs:4};
 const warnings=comparisonDataWarnings(suspect,b);
 assert.equal(warnings.length,1);
 assert.match(warnings[0],/Produkt A/);
 assert.match(warnings[0],/mer sukkerarter enn karbohydrater/);
 assert.deepEqual(comparisonDataWarnings(a,b),[]);
});
