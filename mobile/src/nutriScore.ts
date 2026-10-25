/**
 * Nutri-Score complements NOVA; it describes a nutrition profile, not
 * processing or the healthiness of an individual diet. Do not calculate a
 * local grade from incomplete nutrient records.
 */
export type NutriScoreGrade='a'|'b'|'c'|'d'|'e';
export const NUTRI_SCORE_SOURCE='https://www.santepubliquefrance.fr/en/nutrition-and-physical-activity/nutri-score';
export const NORWEGIAN_LABEL_SOURCE='https://www.helsedirektoratet.no/forebygging-diagnose-og-behandling/forebygging-og-levevaner/kosthold-og-ernaering/merkeordningen-nokkelhullet';
export function parseNutriScore(value:unknown):NutriScoreGrade|null {
 if(typeof value!=='string')return null;
 const grade=value.trim().toLowerCase();
 return grade==='a'||grade==='b'||grade==='c'||grade==='d'||grade==='e'?grade:null;
}
export function nutriScoreLabel(value:NutriScoreGrade|null):string {
 return value===null?'Ikke oppgitt':value.toUpperCase();
}
export function nutriScoreDescription(value:NutriScoreGrade|null):string {
 return value===null
  ? 'Nutri-Score er ikke registrert for dette produktet i datakilden. Vi beregner ikke en karakter fra mangelfulle næringstall.'
  : 'Open Food Facts oppgir Nutri-Score '+value.toUpperCase()+'. Bokstaven beskriver produktets ernæringsprofil etter Nutri-Score-metoden. Den vurderer ikke direkte graden av bearbeiding, tilsetningsstoffer eller individuell helserisiko. Datagrunnlaget og algoritmeversjonen kan variere.';
}
