import type { FoodProduct } from './openFoodFacts';

export type ProductDataStatus={
  observedNutrients:number;
  nutrientFields:number;
  headline:string;
  notes:string[];
};
const KEYS=['energy','protein','fat','carbs','sugar','fiber','salt'] as const;

/**
 * Count a source-reported zero as present. Unknown values are null.
 * Notes are limited to directly observable gaps or internal contradictions.
 */
export function productDataStatus(p:FoodProduct):ProductDataStatus {
  const observedNutrients=KEYS.filter(key=>p[key]!==null).length;
  const notes:string[]=[];
  if(!p.ingredients?.trim())notes.push('Ingredienslisten mangler i dataene vi har.');
  if(p.nova===null)notes.push('NOVA-gruppe er ikke oppgitt.');
  if(observedNutrients<4)notes.push('Flere næringsverdier mangler. Ukjent betyr ikke null.');
  if(p.sugar!==null && p.carbs!==null && p.sugar>p.carbs+0.1)
    notes.push('Sukkerarter er registrert høyere enn karbohydrater. Kontroller emballasjen.');
  if(p.energy===0 && [p.protein,p.fat,p.carbs].some(n=>n!==null&&n>=1))
    notes.push('Energien står som 0 kcal selv om ett eller flere makronæringsstoffer er registrert. Kontroller emballasjen.');
  const headline='Oppgitt i kilden: '+observedNutrients+' av '+KEYS.length+' næringsfelt · '
    +(p.ingredients?.trim()?'ingredienser registrert':'ingredienser mangler')+' · '
    +(p.nova===null?'NOVA mangler':'NOVA '+p.nova+' registrert')+'.';
  return {observedNutrients,nutrientFields:KEYS.length,headline,notes};
}
