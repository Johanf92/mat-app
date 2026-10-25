import type { FoodProduct } from './openFoodFacts';
import { summarizeAdditives, normalizeAdditive, additiveInfo, type AdditiveInfo } from './additives';
import { ingredientCodeEvidence } from './ingredientEvidence';

export type AdditiveEvidenceState = 'both' | 'ingredients' | 'field' | 'not-recorded';
export type ProductAdditiveRow = {
  code: string;
  info: AdditiveInfo;
  evidence: AdditiveEvidenceState;
};
export type ProductAdditiveEvidence = {
  items: ProductAdditiveRow[];
  /** All explicit codes, including family parents suppressed only in the product display. */
  observed: ProductAdditiveRow[];
  unrecognized: string[];
  rawTags: string[];
  groupedParents: string[];
  groupingNote: string | null;
  title: string;
  ingredientOnlyCodes: string[];
};

/**
 * Source of truth for the E-codes explicitly written in ingredient text or in
 * Open Food Facts' separate additive field. Only explicit E-number spellings
 * are parsed; never infer an E-number from its chemical name, aroma or NOVA.
 * A missing code is not evidence the substance is absent.
 *
 * Uses the same family-level deduplication as summarizeAdditives (e.g. E340
 * and E340(ii)) without modifying the stored original tags or ingredients.
 */
export function productAdditiveEvidence(p: Pick<FoodProduct,'ingredients'|'additives'>): ProductAdditiveEvidence {
  const mentioned=ingredientCodeEvidence(p.ingredients,p.additives).mentioned;
  const summarized=summarizeAdditives([...p.additives,...mentioned]);
  const fromIngredients=new Set(mentioned);
  const fromField=new Set(p.additives.map(normalizeAdditive).filter((s):s is string=>s!==null));
  const allCodes=new Set([...mentioned,...fromField]);
  const observed=[...allCodes].map(code=>{
    const info=additiveInfo(code)!;
    const text=fromIngredients.has(code),field=fromField.has(code);
    const evidence: AdditiveEvidenceState=text&&field?'both':text?'ingredients':'field';
    return {code,info,evidence};
  });
  const index=new Map(observed.map(row=>[row.code,row]));
  const items=summarized.items.map(info=>index.get(info.id)!);
  return {
    items,observed,unrecognized:summarized.unrecognized,
    rawTags:[...p.additives],groupedParents:summarized.groupedParents,
    groupingNote:summarized.groupingNote,
    title:summarized.title,
    ingredientOnlyCodes:mentioned.filter(code=>!fromField.has(code)),
  };
}
export function additiveEvidenceLabel(state:AdditiveEvidenceState):string {
  switch(state){
    case 'both':return 'Nevnt i ingredienslisten og registrert i E-kodefeltet';
    case 'ingredients':return 'Kun nevnt i ingredienslisten';
    case 'field':return 'Kun registrert i E-kodefeltet';
    case 'not-recorded':return 'Ingen oppføring i disse feltene';
  }
}
