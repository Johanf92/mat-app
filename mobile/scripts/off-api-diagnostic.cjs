// Manual/one-off network check. Never used by the app.
const ua='Matkontroll/0.1 (https://github.com/Johanf92/mat-app)';
const probes=[
 ['exact-app-coca','https://search.openfoodfacts.org/search?q=Coca+Cola+countries_tags%3A%22en%3Anorway%22&page_size=3&page=1&langs=no%2Cen&fields=code%2Cproduct_name%2Cbrands%2Ccountries_tags%2Ccategories_tags%2Cnova_group%2Cnutriments%2Cingredients_text%2Cquantity'],
 ['exact-app-greek','https://search.openfoodfacts.org/search?q=gresk+yoghurt+countries_tags%3A%22en%3Anorway%22&page_size=3&page=1&langs=no%2Cen&fields=code%2Cproduct_name%2Cbrands%2Ccountries_tags%2Ccategories_tags%2Cnova_group%2Cnutriments%2Cingredients_text%2Cquantity'],
];
(async()=>{
  for (const [label,url] of probes){
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),15000);
      const response=await fetch(url,{headers:{'User-Agent':ua,Accept:'application/json'},signal:controller.signal});
      clearTimeout(timeout);
      const raw=await response.text();
      let parsed;
      try{parsed=JSON.parse(raw);}catch{}
      const hit=parsed?.hits?.[0]??parsed?.hits?.hits?.[0]??parsed?.products?.[0]??null;
      console.log(JSON.stringify({
        label,status:response.status,contentType:response.headers.get('content-type'),
        keys:parsed&&typeof parsed==='object'?Object.keys(parsed).slice(0,15):[],
        hitsIsArray:Array.isArray(parsed?.hits),
        hitsNested:!!parsed?.hits?.hits,productsIsArray:Array.isArray(parsed?.products),
        count:parsed?.count??null,
        firstKeys:hit&&typeof hit==='object'?Object.keys(hit).slice(0,25):[],
        firstCode:hit?.code??hit?._source?.code??null,
        firstNameType:typeof hit?.product_name,firstBrandType:typeof hit?.brands,
        brandPreview:JSON.stringify(hit?.brands??null).slice(0,180),
        ingredientsType:typeof hit?.ingredients_text,
        firstCountries:Array.isArray(hit?.countries_tags)?hit.countries_tags.slice(0,4):null,
        firstNames:Array.isArray(parsed?.hits)?parsed.hits.slice(0,3).map(p=>({code:p.code,name:typeof p.product_name==='string'?p.product_name.slice(0,90):String(p.product_name??'').slice(0,90)})):[],
        responsePreview:!parsed?raw.slice(0,110).replace(/\s+/g,' '):undefined
      }));
    }catch(e){console.log(JSON.stringify({label,error:String(e)}));}
  }
})().catch(e=>console.error(e));
