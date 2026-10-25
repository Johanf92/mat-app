const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function loadTs(name, mocks={}) {
  const sourcePath=path.resolve(__dirname,'../src/'+name+'.ts');
  const compiled=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
    fileName:sourcePath,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true
  });
  assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
  const loaded=new Module(sourcePath,module);loaded.filename=sourcePath;
  loaded.require=id=>{
    if(Object.prototype.hasOwnProperty.call(mocks,id))return mocks[id];
    throw Error('Unexpected dependency: '+id);
  };
  loaded._compile(compiled.outputText,sourcePath);
  return loaded.exports;
}
const additiveModule=loadTs('additives');
const ingredientModule=loadTs('ingredientEvidence',{'./additives':additiveModule});
const comparisonModule=loadTs('comparison',{
 './catalog':{amount:(n,unit='g')=>n===null?'Ikke oppgitt':n.toLocaleString('nb-NO',{maximumFractionDigits:2})+' '+unit},
 './ingredientEvidence':ingredientModule,
 './additives':additiveModule
});
const {comparisonInsight,metricAmount,METRICS,COMPARE_OPTIONS,comparisonDataWarnings,keyDifferences,
 additiveEvidenceRows,additiveEvidenceLabel,additiveDifferenceSummary}=comparisonModule;
const a={name:'Naturell yoghurt A',nova:1,ingredients:'Melk, kultur',protein:10,sugar:4,fat:3,carbs:5,energy:90,salt:0.1,fiber:0,additives:[]};
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


test('overview highlights factual sugar, protein and salt differences without ranking foods', () => {
 const first={...a,nova:1,protein:9,sugar:3.3,salt:0.1,ingredients:'_Melk_, kultur'};
 const second={...b,nova:3,protein:6.5,sugar:11,salt:0.29,ingredients:'Melk, yoghurtkultur'};
 const items=keyDifferences(first,second);
 assert.deepEqual(items.map(x=>x.key),['nova','sugar','protein','salt']);
 assert.match(items.find(x=>x.key==='salt').description,/0,1 g/);
 assert.match(items.find(x=>x.key==='salt').description,/0,29 g/);
 assert.doesNotMatch(items.map(x=>x.description).join(' '),/sunnere|sunnest|verste|anbefalt/);
});
test('same recorded nutrients do not invent differences; ingredient wording is marked as uncertain',()=>{
 const first={...a,ingredients:'_Melk_, kultur',additives:[],nova:1};
 const same={...first,ingredients:'Melk, kultur',name:'Other name'};
 assert.equal(keyDifferences(first,same)[0].key,'no-clear-differences');
 const changed={...same,ingredients:'Lettmelk, yoghurtkultur'};
 const items=keyDifferences(first,changed);
 assert.equal(items.find(x=>x.key==='ingredients').label,'Ingredienslister');
 assert.match(items.find(x=>x.key==='ingredients').description,/bekrefter ikke/);
});
test('overview does not replace unknown data with zero or claim missing E-codes are absent',()=>{
 const first={...a,nova:null,protein:null,ingredients:undefined,additives:[]};
 const second={...b,nova:1,protein:9,ingredients:'Melk, kultur',additives:['en:e338']};
 const keys=keyDifferences(first,second).map(x=>x.key);
 assert.ok(keys.includes('nova-unknown'));
 assert.ok(keys.includes('missing-ingredients'));
 assert.ok(keys.includes('e-codes'));
 assert.ok(!keys.includes('protein'));
});

test('real cola ingredient and field evidence separates E211, E290, E150d and shared E338',()=>{
 const cola={...a,name:'Coca-Cola Original Taste',ingredients:'Kullsyreholdig vann, sukker, fargestoff (E150d), syre (E338), naturlige aromaer',additives:['en:e150d','en:e338']};
 const grans={...b,name:'Cola',ingredients:'Vann, sukker, kullsyre, syre (E338), farge (E150D), konserveringsmiddel (E211)',additives:['en:e211','en:e290','en:e338']};
 const rows=additiveEvidenceRows(cola,grans);
 assert.deepEqual(rows.map(x=>x.code),['E211','E290','E150D','E338']);
 const e211=rows.find(x=>x.code==='E211');
 assert.deepEqual([e211.aEvidence,e211.bEvidence],['not-recorded','both']);
 assert.equal(e211.name,'Natriumbenzoat');
 assert.equal(e211.role,'Konserveringsmiddel');
 assert.match(additiveDifferenceSummary(e211),/produkt B/);
 const e290=rows.find(x=>x.code==='E290');
 assert.deepEqual([e290.aEvidence,e290.bEvidence],['not-recorded','field']);
 assert.match(additiveEvidenceLabel(e290.bEvidence),/Kun registrert/);
 const e150d=rows.find(x=>x.code==='E150D');
 assert.deepEqual([e150d.aEvidence,e150d.bEvidence],['both','ingredients']);
 assert.match(additiveDifferenceSummary(e150d),/begge/);
 const shared=rows.find(x=>x.code==='E338');
 assert.deepEqual([shared.aEvidence,shared.bEvidence],['both','both']);
 assert.equal(shared.differs,false);
});
test('code comparison never infers additives from kullsyre or their chemical names',()=>{
 const cola={...a,ingredients:'Kullsyre, fosforsyre, karamellfarge',additives:[]};
 const other={...b,ingredients:'Kullsyre',additives:['en:e290']};
 const rows=additiveEvidenceRows(cola,other);
 assert.deepEqual(rows.map(x=>x.code),['E290']);
 assert.equal(rows[0].aEvidence,'not-recorded');
 assert.equal(rows[0].bEvidence,'field');
 assert.doesNotMatch(additiveEvidenceLabel(rows[0].aEvidence),/uten/);
});
test('empty or missing E-code fields do not become an absence claim',()=>{
 assert.deepEqual(additiveEvidenceRows({...a,ingredients:undefined,additives:[]},{...b,ingredients:undefined,additives:[]}),[]);
 const rows=additiveEvidenceRows({...a,ingredients:undefined,additives:[]},{...b,ingredients:'E211',additives:[]});
 assert.equal(rows[0].aEvidence,'not-recorded');
 assert.equal(rows[0].bEvidence,'ingredients');
 assert.match(additiveDifferenceSummary(rows[0]),/tilgjengelige feltene/);
});
test('code normalization ignores case but does not collapse parent and variant without evidence',()=>{
 const one={...a,ingredients:'E340(ii) og E150d',additives:['en:e340ii','en:e150d']};
 const other={...b,ingredients:'E340 og E150D',additives:['en:e340','E150D']};
 const rows=additiveEvidenceRows(one,other);
 assert.deepEqual(rows.map(x=>x.code),['E340','E340II','E150D']);
 const caramel=rows.find(x=>x.code==='E150D');
 assert.equal(caramel.differs,false);
});
