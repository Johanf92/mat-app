// Manual/one-off network check. Never used by the app.
const ua='Matkontroll/0.1 (https://github.com/Johanf92/mat-app)';
const probes=[
  ['search-plain','https://search.openfoodfacts.org/search?q=cola&page_size=2&fields=code,product_name,brands,countries_tags,nutriments,categories_tags,nova_group'],
  ['search-market','https://search.openfoodfacts.org/search?q=cola%20countries_tags%3A%22en%3Anorway%22&page_size=2&fields=code,product_name,brands,countries_tags,nutriments,categories_tags,nova_group'],
  ['structured','https://world.openfoodfacts.org/api/v2/search?categories_tags=en%3Agreek-yogurts&countries_tags_en=norway&page_size=2&fields=code,product_name,brands,countries_tags,nutriments,categories_tags,nova_group'],
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
        responsePreview:!parsed?raw.slice(0,110).replace(/\s+/g,' '):undefined
      }));
    }catch(e){console.log(JSON.stringify({label,error:String(e)}));}
  }
})().catch(e=>console.error(e));
