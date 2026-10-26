// One-off diagnostic. No API requests are made by tests or the mobile app.
// Run manually: cd mobile && node scripts/coverage-audit.cjs
const terms=['gresk yoghurt','naturell yoghurt','skyr naturell','kefir','lettmelk','helmelk','havregryn','glutenfri havregryn','cornflakes','grovbrød','knekkebrød','makrell i tomat','leverpostei','brunost','gulost','jordbærsyltetøy','Heinz ketchup','ketchup mindre sukker','majones','sennep','havredrikk','barista havredrikk','cola','cola zero','appelsinjuice','tomatsuppe','frossenpizza','pasta','hermetiske bønner','fiskekaker'];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const detailSamples=[];
const sampleQueries=new Set(['gresk yoghurt','havregryn','makrell i tomat','Heinz ketchup','cola']);
const ua='Matkontroll/0.1 coverage-audit (https://github.com/Johanf92/mat-app)';
const fields='code,product_name,product_name_no,brands,countries_tags,image_front_small_url,ingredients_text,ingredients_text_no,ingredients_text_nb,nutriments,nova_group,nutriscore_grade';
(async()=>{
 const rows=[];
 for(const q of terms){
  const url=new URL('https://search.openfoodfacts.org/search');
  url.searchParams.set('q',q+' countries_tags:"en:norway"');
  url.searchParams.set('page_size','10');url.searchParams.set('page','1');
  url.searchParams.set('langs','no,en');url.searchParams.set('fields',fields);
  try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
   let response;
   try{response=await fetch(url,{headers:{'User-Agent':ua,Accept:'application/json'},signal:controller.signal});}
   finally{clearTimeout(timer);}
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();if(!Array.isArray(json.hits))throw Error('Unexpected API response');
   const first=json.hits[0]||{};
   const nutrition=first.nutriments||{};
   const hasNutrition=Object.keys(nutrition).some(k=>/_(100g|100ml)$/.test(k));
   rows.push({query:q,hits:json.hits.length,firstBarcode:first.code||null,firstName:first.product_name_no||first.product_name||null,firstBrand:first.brands||null,hasImage:!!first.image_front_small_url,hasIngredients:!!(first.ingredients_text_no||first.ingredients_text_nb||first.ingredients_text),hasNutrition,hasNova:typeof first.nova_group==='number',hasNutriScore:!!first.nutriscore_grade});
   if(sampleQueries.has(q)&&/^\d{8,14}$/.test(String(first.code||''))){
    await wait(1100);
    const detailUrl='https://world.openfoodfacts.org/api/v2/product/'+first.code+'.json?fields=code,product_name,ingredients_text,ingredients_text_no,ingredients_text_nb,ingredients_text_en,nova_group';
    try{
     const detailResponse=await fetch(detailUrl,{headers:{'User-Agent':ua,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
     if(!detailResponse.ok)throw Error('HTTP '+detailResponse.status);
     const detail=await detailResponse.json(),p=detail.product||{};
     detailSamples.push({query:q,code:first.code,searchHasIngredients:!!(first.ingredients_text||first.ingredients_text_no||first.ingredients_text_nb||first.ingredients_text_en),
      detailHasIngredients:!!(p.ingredients_text||p.ingredients_text_no||p.ingredients_text_nb||p.ingredients_text_en),
      searchHasNova:typeof first.nova_group==='number',detailHasNova:typeof p.nova_group==='number',detailStatus:detail.status});
    }catch(e){detailSamples.push({query:q,code:first.code,error:String(e)});}
   }
  }catch(e){rows.push({query:q,error:String(e)});}
  await wait(1100);
 }
 console.log(JSON.stringify({createdAt:new Date().toISOString(),country:'Norway',warning:'Raw search-index evidence, not verified product matches. Detail samples compare the same barcode, not product relevance.',rows,detailSamples},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
