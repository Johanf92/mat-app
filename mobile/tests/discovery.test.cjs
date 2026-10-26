const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../src/discovery.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let sameKind=true;
const mockedModule={exports:{}};
vm.runInNewContext(js,{module:mockedModule,exports:mockedModule.exports,require(id){
 if(id==='./alternatives')return {productProfile:()=>({kind:'oats-plain'}),matchesProfile:()=>sameKind};
 if(id==='./productDataStatus')return {productDataStatus:p=>({issues:p.invalid?['conflict']:[],cautions:p.suspicious?['verify']:[]})};
 throw Error(id);
}});
const {verifiedProcessingDiscovery}=mockedModule.exports;
const a={code:'11111111',name:'Havregryn',nova:4};
const b={code:'22222222',name:'Havregryn',nova:2};
test('one directly verified lower NOVA variant may qualify',()=>{
 assert.equal(verifiedProcessingDiscovery(a,b),true);
});
test('missing, equal, higher, or same-barcode records never qualify',()=>{
 for(const other of [{...b,nova:null},{...b,nova:4},{...b,nova:1,code:a.code}])
  assert.equal(verifiedProcessingDiscovery(a,other),false);
});
test('inconsistent records, different type or dietary label cannot be promoted',()=>{
 assert.equal(verifiedProcessingDiscovery(a,{...b,invalid:true}),false);
 assert.equal(verifiedProcessingDiscovery({...a,name:'Glutenfri havregryn'},b),false);
 sameKind=false;
 assert.equal(verifiedProcessingDiscovery(a,b),false);
});

test('suspicious source record is not automatically promoted as a better variant',()=>{
 assert.equal(verifiedProcessingDiscovery(a,{...b,suspicious:true}),false);
});
