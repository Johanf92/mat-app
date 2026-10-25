import { type FoodProduct } from './openFoodFacts';
import { amount } from './catalog';

export type CompareFocus = 'processing' | 'ingredients' | 'protein' | 'sugar';
export const COMPARE_OPTIONS: { key: CompareFocus; label: string }[] = [
  { key: 'processing', label: 'Bearbeiding' },
  { key: 'ingredients', label: 'Ingredienser' },
  { key: 'protein', label: 'Protein' },
  { key: 'sugar', label: 'Sukker' },
];
export type MetricKey = 'energy' | 'protein' | 'fat' | 'carbs' | 'sugar' | 'fiber' | 'salt';
export const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'energy', label: 'Energi', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'fat', label: 'Fett', unit: 'g' },
  { key: 'carbs', label: 'Karbohydrat', unit: 'g' },
  { key: 'sugar', label: 'Hvorav sukkerarter', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'salt', label: 'Salt', unit: 'g' },
];

export function metricAmount(product: FoodProduct, metric: MetricKey, unit = 'g'): string {
  return amount(product[metric], unit);
}

export function comparisonInsight(a: FoodProduct, b: FoodProduct, focus: CompareFocus): string {
  if (focus === 'processing') {
    if (a.nova === null || b.nova === null) return 'NOVA mangler for minst ett av produktene. Vi gjetter ikke bearbeidingsgrad.';
    if (a.nova === b.nova) return 'Begge produktene er registrert i NOVA ' + a.nova + '. Det betyr ikke at de har identisk sammensetning.';
    return a.name + ' er registrert i NOVA ' + a.nova + ', mens ' + b.name + ' er registrert i NOVA ' + b.nova + '. Vi kan ikke fastslå hvorfor klassifiseringene er ulike bare ut fra næringstallene. NOVA beskriver bearbeiding, ikke en samlet helsescore.';
  }
  if (focus === 'ingredients') {
    if (!a.ingredients || !b.ingredients) return 'Ingredienslisten mangler for minst ett produkt. Da kan vi ikke trekke sikre konklusjoner om forskjellene.';
    return 'Begge ingredienslistene er registrert. Les dem nedenfor. Vi teller ikke ingredienser automatisk, siden kildetekstene ofte er flerspråklige eller ufullstendige.';
  }
  const key = focus === 'protein' ? 'protein' : 'sugar';
  const x = a[key], y = b[key];
  if (x === null || y === null) return 'Opplysninger om ' + (focus === 'protein' ? 'protein' : 'sukkerarter') + ' mangler for minst ett produkt.';
  const difference = Math.round(Math.abs(x - y) * 100) / 100;
  if (difference < 0.005) return 'Begge produktene har samme registrerte mengde ' + (focus === 'protein' ? 'protein' : 'sukkerarter') + ' per 100 g / 100 ml.';
  const higher = x > y ? a.name : b.name;
  const qualifier = focus === 'sugar' ? ' Dette inkluderer naturlig forekommende sukker og sier ikke alene noe om tilsatt sukker.' : '';
  return higher + ' har ' + amount(difference) + ' mer ' + (focus === 'protein' ? 'protein' : 'sukkerarter') + ' per 100 g / 100 ml (slik kilden oppgir).' + qualifier;
}


/**
 * Only assert cross-field contradictions directly visible in the source.
 * Comparisons must never infer ingredients, added sugar or health outcomes.
 */
export function comparisonDataWarnings(a: FoodProduct, b: FoodProduct): string[] {
  const notices: string[] = [];
  for (const [letter, product] of [['A', a], ['B', b]] as const) {
    if (product.sugar !== null && product.carbs !== null && product.sugar > product.carbs + 0.1)
      notices.push('Produkt ' + letter + ' har registrert mer sukkerarter enn karbohydrater. Dette kan være en feil i datagrunnlaget.');
  }
  return notices;
}
