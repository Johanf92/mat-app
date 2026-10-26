import type { FoodProduct } from './openFoodFacts';

export type ProductDataStatus={
  observedNutrients:number;
  nutrientFields:number;
  headline:string;
  notes:string[];
  /** Observed internal contradictions, not a health or reliability score. */
  issues:string[];
  /** Compact neutral caveat for the product overview, only when useful. */
  summaryNotice:string|null;
};
const KEYS=['energy','protein','fat','carbs','sugar','fiber','salt'] as const;
const CORE_KEYS=['energy','protein','fat','carbs','sugar','salt'] as const;
const NAMES:Record<(typeof KEYS)[number],string>={
 energy:'energi',protein:'protein',fat:'fett',carbs:'karbohydrater',
 sugar:'sukkerarter',fiber:'fiber',salt:'salt',
};

/**
 * Count actual recorded zeroes as present, and missing fields as unknown.
 * Avoid per-food benchmarks, subjective rankings or inferred health outcomes.
 * Nutrient values are never silently "fixed" even when they look inconsistent.
 */
export function productDataStatus(p:FoodProduct):ProductDataStatus {
 const observedNutrients=KEYS.filter(key=>p[key]!==null&&p[key]!==undefined).length;
 const missingCore=CORE_KEYS.filter(key=>p[key]===null||p[key]===undefined);
 const issues:string[]=[];
 if(p.sugar!==null&&p.sugar!==undefined&&p.carbs!==null&&p.carbs!==undefined
   &&p.sugar>p.carbs+0.1)
   issues.push('Sukkerarter er registrert høyere enn karbohydrater. Kontroller emballasjen.');
 if(p.energy===0&&[p.protein,p.fat,p.carbs].some(n=>n!==null&&n!==undefined&&n>=1))
   issues.push('Energien står som 0 kcal selv om ett eller flere makronæringsstoffer er registrert. Kontroller emballasjen.');
 if(p.energyKJConflict)
   issues.push('Oppgitt energi i kcal og kJ stemmer ikke godt overens. Vi viser kcal-verdien fra kilden uten å rette den automatisk.');
 for(const key of ['protein','fat','carbs','sugar','fiber','salt'] as const){
   const label=NAMES[key];
   const amount=p[key];
   if(amount!==null&&amount!==undefined&&amount>100.1)
     issues.push('Registrert '+label+' overstiger 100 g per 100 g/100 ml. Kontroller enhet og emballasje.');
 }
 // A literal zero is data, not a missing value. For natural yoghurt, a
 // zero sugar value alongside registered carbohydrates merits a neutral
 // packaging check, never an automatic correction.
 const dairyName=(p.name||'').toLowerCase();
 const plausibleYogurt=/yogh?urt|yogur|skyr/.test(dairyName);
 if(plausibleYogurt&&p.sugar===0&&p.carbs!==null&&p.carbs>=1)
   issues.push('Sukkerarter er registrert som 0 g, selv om yoghurtproduktet har karbohydrater. Verdien kan være riktig, men bør kontrolleres mot emballasjen.');
 const notes:string[]=[...issues];
 if(!p.ingredients?.trim())notes.push('Ingredienslisten mangler i dataene vi har.');
 if(p.nova===null||p.nova===undefined)notes.push('NOVA-gruppe er ikke oppgitt.');
 if(p.nutriScore===null)notes.push('Nutri-Score er ikke oppgitt. Vi beregner ikke en karakter fra næringsdata.');
 if(missingCore.length>=3)
   notes.push('Flere næringsverdier mangler ('+missingCore.map(key=>NAMES[key]).join(', ')+'). Ukjent betyr ikke null.');
 else if(missingCore.length>0)
   notes.push('Ikke oppgitt: '+missingCore.map(key=>NAMES[key]).join(', ')+'. Manglende verdi er ikke null.');
 if(p.energyConvertedFromKJ)
   notes.push('Energi (kcal) er regnet om fra registrerte kilojoule (kJ) med 1 kcal = 4,184 kJ. Vi anslår ikke andre manglende næringsverdier.');
 if(p.name==='Produktnavn mangler')notes.push('Produktnavn er ikke registrert.');
 const headline='Oppgitt i kilden: '+observedNutrients+' av '+KEYS.length+' næringsfelt · '
   +(p.ingredients?.trim()?'ingredienser registrert':'ingredienser mangler')+' · '
   +(p.nova===null||p.nova===undefined?'NOVA mangler':'NOVA '+p.nova+' registrert')+'.';
 const summaryNotice=issues.length
   ?'Noen registrerte næringstall virker motstridende. Se «Kilde og datakvalitet».'
   :!p.ingredients?.trim() || missingCore.length>=3
    ?'Viktige opplysninger mangler i datakilden. Se «Kilde og datakvalitet».'
    :null;
 return {observedNutrients,nutrientFields:KEYS.length,headline,notes,issues,summaryNotice};
}
