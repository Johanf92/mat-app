const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const sourcePath=path.resolve(__dirname,'../src/productSnapshot.ts');
const out=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{
 fileName:sourcePath,reportDiagnostics:true,
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
});
assert.equal((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const mod=new Module(sourcePath,module);mod.filename=sourcePath;
mod.require=id=>{if(id==='./catalog')return {amount:(v,unit='g')=>v===null?'Ikke oppgitt':v.toLocaleString('nb-NO')+' '+unit};throw Error(id);};
mod._compile(out.outputText,sourcePath);
const {productSnapshot}=mod.exports;
const sample={name:'Cola',nova:4,sugar:10.6};
test('snapshot keeps NOVA, sugar, E-code fields separate and factual',()=>{
 const lines=productSnapshot(sample,2);
 assert.match(lines[0],/NOVA 4/);
 assert.match(lines[1],/10,6 g/);
 assert.match(lines[2],/2 E-kodeoppføringer/);
 assert.doesNotMatch(lines.join(' '),/sunn|farlig|best/);
});
test('unknown information remains unknown; zero sugar is not missing',()=>{
 const missing=productSnapshot({...sample,nova:null,sugar:null},0);
 assert.match(missing[0],/ikke oppgitt/);
 assert.match(missing[1],/ikke oppgitt/);
 assert.match(missing[2],/ikke at varen er fri/);
 assert.match(productSnapshot({...sample,sugar:0},1)[1],/0 g/);
});
