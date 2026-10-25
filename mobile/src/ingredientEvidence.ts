import { formatAdditiveCode, normalizeAdditive } from './additives';

/**
 * Open Food Facts uses surrounding underscores to mark highlighted ingredients
 * (often allergens). Hide ONLY paired markers at word/phrase boundaries.
 * Keep the source field untouched in the FoodProduct and never translate,
 * delete, or reinterpret ingredient names.
 */
export function displayIngredientText(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/(^|[\s(,;:])_([^_\r\n]{1,120})_(?=$|[\s),;:.!?])/gm,
    (_match, prefix: string, ingredient: string) => prefix + ingredient);
}

export type IngredientCodeEvidence = {
  mentioned: string[];
  notInSeparateField: string[];
};

/**
 * Extract only explicit "E150d" / "E 338" / "E340(ii)" identifiers from
 * ingredient text. Never infer additives by chemical name or by synonyms.
 * A code on the label is evidence of a *mention*, not proof about the recipe.
 */
export function ingredientCodeEvidence(
  ingredientText: string | undefined,
  recordedTags: readonly string[],
): IngredientCodeEvidence {
  const mentioned = new Set<string>();
  const text = ingredientText ?? '';
  const pattern = /\bE[\s-]?\d{3,4}(?:[a-z]|\([ivx]+\))?(?![a-z0-9])/gi;
  for (const match of text.matchAll(pattern)) {
    // Avoid treating an unrelated vitamin E measurement as an E-number.
    const preceding = text.slice(Math.max(0, (match.index ?? 0) - 20), match.index);
    if (/\bvitamins?\s*$/i.test(preceding)) continue;
    const normalized = normalizeAdditive(match[0].replace(/^E[\s-]+/i, 'E'));
    if (normalized) mentioned.add(normalized);
  }
  const tags = new Set(recordedTags.map(normalizeAdditive).filter((id): id is string => id !== null));
  const codes = [...mentioned];
  return {
    mentioned: codes,
    notInSeparateField: codes.filter(code => !tags.has(code)),
  };
}

export function ingredientCodeNote(ingredientText: string | undefined, tags: readonly string[]): string | null {
  const codes = ingredientCodeEvidence(ingredientText, tags).notInSeparateField;
  if (codes.length === 0) return null;
  const label = codes.map(formatAdditiveCode).join(', ');
  return 'Ingredienslisten nevner ' + label
    + ', men ' + (codes.length === 1 ? 'denne koden er' : 'disse kodene er')
    + ' ikke oppført med samme kode i datakildens separate E-kodefelt. Registreringene kan være ufullstendige.';
}
