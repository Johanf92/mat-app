const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filepath = path.resolve(__dirname,'../src/allergens.ts');
const compiled=ts.transpileModule(fs.readFileSync(filepath,'utf8'),{
 fileName:filepath,
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
 reportDiagnostics:true
});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
const mod=new Module(filepath,module);mod.filename=filepath;mod._compile(compiled.outputText,filepath);
const {formatAllergenTags}=mod.exports;
test('duplicated translated milk + lettmelk entries display as one Norwegian allergen',()=>{
 const input=['en:milk','no:lettmelk'];
 assert.deepEqual(formatAllergenTags(input),['Melk']);
 assert.deepEqual(input,['en:milk','no:lettmelk'],'the source array must remain unchanged');
});
test('common allergen groups are displayed in Norwegian without losing distinct ones',()=>{
 assert.deepEqual(formatAllergenTags(['en:milk','en:eggs','en:soybeans','en:peanuts']),['Melk','Egg','Soya','Peanøtter']);
 assert.deepEqual(formatAllergenTags(['en:gluten','en:wheat','no:hvete']),['Gluten','Hvete']);
});
test('unknown source labels are retained rather than guessed as an allergen or safety claim',()=>{
 assert.deepEqual(formatAllergenTags(['en:lactose','no:ukjent-stoff','unknown']),['lactose','ukjent stoff','unknown']);
 assert.deepEqual(formatAllergenTags([]),[]);
 assert.deepEqual(formatAllergenTags(['en:milk','EN:MILK','en:eggs']),['Melk','Egg']);
});
