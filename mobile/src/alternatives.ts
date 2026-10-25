import {type FoodProduct, searchByCategory} from './openFoodFacts';
import {type Market} from './catalog';
// Conservative matching: never mix broad generic foods with narrow product categories.
const preferred=['en:greek-yogurts','en:greek-style-yogurts','en:natural-yogurts','en:plain-yogurts','en:oat-milks','en:oat-drinks','en:plant-based-milks','en:barista-drinks','en:yogurts','en:soft-drinks'];
const exclude=new Set(['en:foods','en:beverages','en:plant-based-foods-and-beverages','en:dairies','en:fermented-foods','en:drinks','en:groceries','en:plant-based-foods']);
export function comparableCategory(product:FoodProduct):string|null {
 const found=preferred.find(x=>product.categories.includes(x));if(found)return found;
 const candidates=product.categories.filter(x=>x.startsWith('en:')&&!exclude.has(x));
 // Unknown categories require review: do not recommend arbitrary substitutes.
 return null;
}
export async function findAlternatives(p:FoodProduct,market:Market,signal?:AbortSignal):Promise<FoodProduct[]>{
 const category=comparableCategory(p);if(!category)return [];
 const items=await searchByCategory(category,market,signal);
 return items.filter(x=>x.code!==p.code&&x.categories.includes(category)&&(!market.tag||x.countries.includes(market.tag)))
  .filter(x=>!!x.ingredients&&x.protein!==null&&x.fat!==null&&x.carbs!==null).slice(0,6);
}
