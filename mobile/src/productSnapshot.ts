import { amount } from './catalog';
import type {FoodProduct} from './openFoodFacts';

/**
 * Literal source facts only: no "good/bad" language or invented nutrient data.
 * A count from the separate E-code field is not the number of substances
 * actually present in the packaged food.
 */
export function productSnapshot(p:FoodProduct,registeredAdditiveCount:number):string[] {
 return [
  p.nova===null?'NOVA er ikke oppgitt.':'Registrert bearbeidingsgrad: NOVA '+p.nova+'.',
  p.sugar===null?'Sukkerarter er ikke oppgitt.':'Sukkerarter: '+amount(p.sugar)+' per oppgitt 100 g / 100 ml.',
  registeredAdditiveCount>0
   ?registeredAdditiveCount+' E-kodeoppføring'+(registeredAdditiveCount===1?'':'er')+' i eget datafelt.'
   :'Ingen E-koder registrert i eget datafelt. Det betyr ikke at varen er fri for tilsetningsstoffer.',
 ];
}
