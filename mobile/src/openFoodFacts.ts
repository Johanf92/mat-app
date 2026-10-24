// Open Food Facts is crowdsourced. Never interpret missing fields as zero or allergen-free.
const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_no,brands,image_front_small_url,image_front_url,ingredients_text,ingredients_text_no,nova_group,nutriments,additives_tags,allergens_tags,quantity';
export type FoodProduct = {
 code:string; name:string; brand:string; image?:string; quantity?:string;
 ingredients?:string; nova:number|null; protein:number|null; sugar:number|null;
 fiber:number|null; salt:number|null; energy:number|null;
 additives:string[]; allergens:string[];
};
type Raw = Record<string,any>;
function number(value:unknown):number|null { return typeof value==='number' && Number.isFinite(value)?value:null; }
export function normalize(raw:Raw):FoodProduct|null {
 const code=String(raw.code??'').trim();
 const name=String(raw.product_name_no||raw.product_name||'').trim();
 if(!code||!name)return null;
 const n=raw.nutriments??{};
 return {code,name,brand:String(raw.brands||'Ukjent merke'),image:raw.image_front_small_url||raw.image_front_url||undefined,
 quantity:raw.quantity||undefined,ingredients:raw.ingredients_text_no||raw.ingredients_text||undefined,
 nova:[1,2,3,4].includes(raw.nova_group)?raw.nova_group:null,
 protein:number(n.proteins_100g),sugar:number(n.sugars_100g),fiber:number(n.fiber_100g),
 salt:number(n.salt_100g),energy:number(n['energy-kcal_100g']),
 additives:Array.isArray(raw.additives_tags)?raw.additives_tags:[],
 allergens:Array.isArray(raw.allergens_tags)?raw.allergens_tags:[]};
}
async function getJson(url:string,signal?:AbortSignal):Promise<any> {
 const response=await fetch(url,{headers:{Accept:'application/json'},signal});
 if(!response.ok)throw new Error('Tjenesten svarte med '+response.status);
 return response.json();
}
export async function searchProducts(query:string,signal?:AbortSignal):Promise<FoodProduct[]> {
 const q=query.trim();if(q.length<2)return [];
 const url=BASE+'/cgi/search.pl?search_simple=1&action=process&json=1&page_size=15&search_terms='+encodeURIComponent(q)+'&fields='+encodeURIComponent(FIELDS);
 const data=await getJson(url,signal);
 return (Array.isArray(data.products)?data.products:[]).map(normalize).filter((p:FoodProduct|null):p is FoodProduct=>p!==null);
}
export async function getProduct(barcode:string,signal?:AbortSignal):Promise<FoodProduct|null> {
 if(!/^\d{8,14}$/.test(barcode))return null;
 const data=await getJson(BASE+'/api/v2/product/'+encodeURIComponent(barcode)+'.json?fields='+encodeURIComponent(FIELDS),signal);
 return data.status===1?normalize(data.product??{}):null;
}
