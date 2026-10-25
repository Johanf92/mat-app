import { amount } from './catalog';
import type {FoodProduct} from './openFoodFacts';

/**
 * Literal source facts only: no "good/bad" language or invented nutrient data.
 * A count of explicit E-codes in ingredient text and the E-code field is
 * not the number of substances actually present in the packaged food.
 */
export function productSnapshot(p:FoodProduct,registeredAdditiveCount:number,unrecognizedCount=0):string[] {
 return [
  p.nova===null?'NOVA er ikke oppgitt.':'Registrert bearbeidingsgrad: NOVA '+p.nova+'.',
  p.sugar===null?'Sukkerarter er ikke oppgitt.':'Sukkerarter: '+amount(p.sugar)+' per oppgitt 100 g / 100 ml.',
  registeredAdditiveCount>0
   ?registeredAdditiveCount+' eksplisitt E-kodeoppføring'+(registeredAdditiveCount===1?'':'er')+' i ingredienslisten og/eller eget E-kodefelt.'
   :unrecognizedCount>0?'Ingen gjenkjennelige E-numre, men '+unrecognizedCount+' oppføring'+(unrecognizedCount===1?'':'er')+' med ukjent format i datafeltet.'
   :'Ingen eksplisitte E-koder registrert i ingredienslisten eller eget E-kodefelt. Det betyr ikke at varen er fri for tilsetningsstoffer.',
 ];
}
