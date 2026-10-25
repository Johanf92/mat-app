import type { FoodProduct } from './openFoodFacts';
import { displayIngredientText } from './ingredientEvidence';

type ListedTerm={key:string;label:string;re:RegExp};
/**
 * Small explicitly matched vocabulary, not a tokenizer, ingredient count or
 * semantic translation. Word boundaries avoid e.g. treating "sukkerfri" as
 * proof of listed sugar. Terms are matched only against ingredient source text.
 */
const TERMS:readonly ListedTerm[]=[
  {key:'sugar',label:'sukker',re:/(^|[^a-zA-ZÀ-ÖØ-öø-ÿ])(?:sukker|sugar|sukrose|sucrose)(?=$|[^a-zA-ZÀ-ÖØ-öø-ÿ-])/iu},
  {key:'sweetener',label:'søtstoff eller søtstoffnavn',re:/(^|[^a-zA-ZÀ-ÖØ-öø-ÿ])(?:søtstoff(?:er)?|sweetener(?:s)?|aspartam(?:e)?|acesulfam[\s-]*k|sukralose|sucralose|stevia)(?=$|[^a-zA-ZÀ-ÖØ-öø-ÿ])/iu},
  {key:'salt',label:'salt',re:/(^|[^a-zA-ZÀ-ÖØ-öø-ÿ])(?:salt|sea[\s-]*salt|havsalt)(?=$|[^a-zA-ZÀ-ÖØ-öø-ÿ])/iu},
  {key:'oat',label:'havre',re:/(^|[^a-zA-ZÀ-ÖØ-öø-ÿ])(?:havre(?:gryn|base)?|oat(?:s|[\s-]*base)?|kaura)(?=$|[^a-zA-ZÀ-ÖØ-öø-ÿ])/iu},
  {key:'milk',label:'melk',re:/(^|[^a-zA-ZÀ-ÖØ-öø-ÿ])(?:melk|lettmelk|helmelk|skummet[\s-]*melk|milk|skimmed[\s-]*milk)(?=$|[^a-zA-ZÀ-ÖØ-öø-ÿ])/iu},
];

export type IngredientMentionDifference={key:string;label:string;side:'A'|'B'};
export function ingredientMentionDifferences(a:Pick<FoodProduct,'ingredients'>,b:Pick<FoodProduct,'ingredients'>):IngredientMentionDifference[]{
  if(!a.ingredients?.trim()||!b.ingredients?.trim())return [];
  // Ingredient data occasionally contain marketing/absence language.
  // Negated phrases must not count as a positive ingredient mention.
  const stripNegations=(value:string)=>displayIngredientText(value).normalize('NFKC')
    .replace(/\b(?:uten|without|no)\s+(?:(?:tilsatt|added)\s+)?(?:sukker|sugar|søtstoff(?:er)?|sweeteners?|melk|milk|havre|oats|salt)\b/gi,' ');
  const left=stripNegations(a.ingredients);
  const right=stripNegations(b.ingredients);
  return TERMS.flatMap(t=>{
    const inA=t.re.test(left),inB=t.re.test(right);
    if(inA===inB)return [];
    return [{key:t.key,label:t.label,side:inA?'A' as const:'B' as const}];
  });
}
export function ingredientComparisonInsight(a:Pick<FoodProduct,'ingredients'>,b:Pick<FoodProduct,'ingredients'>):string {
  if(!a.ingredients?.trim()||!b.ingredients?.trim())
    return 'Ingredienslisten mangler for minst ett produkt. Da kan vi ikke trekke sikre konklusjoner om forskjellene.';
  const differences=ingredientMentionDifferences(a,b);
  if(differences.length){
    const aTerms=differences.filter(x=>x.side==='A').map(x=>x.label);
    const bTerms=differences.filter(x=>x.side==='B').map(x=>x.label);
    const parts=[
      aTerms.length?'Kun eksplisitt nevnt i registrert tekst for A: '+aTerms.join(', ')+'.':'',
      bTerms.length?'Kun eksplisitt nevnt i registrert tekst for B: '+bTerms.join(', ')+'.':'',
    ].filter(Boolean);
    return parts.join(' ')+' Manglende omtale i den andre listen bekrefter ikke at stoffet er fraværende. Vi teller ikke ingredienser automatisk; kontroller hele teksten og emballasjen.';
  }
  const left=displayIngredientText(a.ingredients).trim().toLocaleLowerCase('nb-NO').replace(/\s+/g,' ');
  const right=displayIngredientText(b.ingredients).trim().toLocaleLowerCase('nb-NO').replace(/\s+/g,' ');
  return left===right
    ? 'Listene har lik registrert ordlyd. Dette dokumenterer ikke identisk oppskrift. Vi teller ikke ingredienser automatisk.'
    : 'Ingredienslistene har ulik ordlyd, men ingen tydelig forskjell blant de få ordene vi kontrollerer eksplisitt. Det bekrefter ikke ulike oppskrifter. Vi teller ikke ingredienser automatisk; les hele listene nedenfor.';
}
