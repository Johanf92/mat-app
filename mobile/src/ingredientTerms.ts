/**
 * Curated explanations of words in ingredient lists that are not themselves
 * E-numbers. Keep them separate from the additive count and NOVA assignment.
 * This is a vocabulary aid, not a safety assessment of the food product.
 */
export type IngredientTermInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  source: string;
};

const AROMA: IngredientTermInfo = {
  id: 'aroma',
  name: 'Aroma',
  category: 'Smak og lukt',
  description:
    '«Aroma» er en samlebetegnelse for stoffer eller blandinger som tilsettes for å gi eller endre lukt og smak. Det er ikke ett bestemt E-nummer. En aroma kan bestå av flere bestanddeler, og ingredienslisten navngir vanligvis ikke alle sammen. Ordet alene forteller ikke hvordan aromaen er fremstilt eller om produktet er helseskadelig.',
  source: 'https://www.mattilsynet.no/mat-og-drikke/matproduksjon/tilsatte-stoffer-i-mat/aroma',
};

/**
 * Require a real word boundary, including Norwegian letters. A phrase such as
 * "koffeinaroma" is not silently split into an isolated word in the source.
 */
const AROMA_WORD = /(^|[^a-zæøå])(?:naturlig(?:e)?\s+)?aroma(?:er|stoffer)?(?=$|[^a-zæøå])/i;

export function ingredientTerms(ingredients: string | undefined): IngredientTermInfo[] {
  if (!ingredients) return [];
  const text = ingredients.normalize('NFKC');
  return AROMA_WORD.test(text) ? [AROMA] : [];
}
