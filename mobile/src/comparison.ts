import { type FoodProduct } from './openFoodFacts';
import { amount } from './catalog';
import { ingredientCodeEvidence, displayIngredientText } from './ingredientEvidence';
import { additiveInfo, formatAdditiveCode, normalizeAdditive } from './additives';

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


/**
 * An E-code can be entered in Open Food Facts' separate additive field,
 * mentioned explicitly in the ingredient text, or both. None of these
 * observations proves absence from a product with no matching entry.
 */
export type AdditiveEvidenceState = 'both' | 'ingredients' | 'field' | 'not-recorded';
export type ComparedAdditive = {
  code: string;
  displayCode: string;
  name: string;
  role: string;
  aEvidence: AdditiveEvidenceState;
  bEvidence: AdditiveEvidenceState;
  differs: boolean;
};
function normalizedTagSet(tags: readonly string[]): Set<string> {
  return new Set(tags.map(normalizeAdditive).filter((code): code is string => code !== null));
}
function statusForCode(code: string, fromIngredients: Set<string>, fromField: Set<string>): AdditiveEvidenceState {
  const inIngredients = fromIngredients.has(code);
  const inField = fromField.has(code);
  return inIngredients && inField ? 'both' : inIngredients ? 'ingredients' : inField ? 'field' : 'not-recorded';
}
export function additiveEvidenceRows(a: FoodProduct, b: FoodProduct): ComparedAdditive[] {
  const aText = new Set(ingredientCodeEvidence(a.ingredients, a.additives).mentioned);
  const bText = new Set(ingredientCodeEvidence(b.ingredients, b.additives).mentioned);
  const aField = normalizedTagSet(a.additives);
  const bField = normalizedTagSet(b.additives);
  const codes = new Set([...aText, ...bText, ...aField, ...bField]);
  const results = [...codes].map(code => {
    const info = additiveInfo(code);
    const aEvidence = statusForCode(code, aText, aField);
    const bEvidence = statusForCode(code, bText, bField);
    return {
      code, displayCode: formatAdditiveCode(code),
      name: info?.name ?? 'Forklaring mangler',
      role: info?.role ?? 'Funksjon ikke avklart',
      aEvidence, bEvidence, differs: aEvidence !== bEvidence,
    };
  });
  // First show codes documented on only one side, then differences in source
  // completeness, then codes documented on both sides in the same way.
  const priority = (row: ComparedAdditive): number => {
    const aListed = row.aEvidence !== 'not-recorded';
    const bListed = row.bEvidence !== 'not-recorded';
    return aListed !== bListed ? 0 : row.differs ? 1 : 2;
  };
  return results.sort((left, right) =>
    priority(left) - priority(right) || left.code.localeCompare(right.code, 'nb', { numeric: true }));
}
export function additiveEvidenceLabel(state: AdditiveEvidenceState): string {
  switch (state) {
    case 'both': return 'Nevnt i ingredienslisten og registrert i E-kodefeltet';
    case 'ingredients': return 'Kun nevnt i ingredienslisten';
    case 'field': return 'Kun registrert i E-kodefeltet';
    case 'not-recorded': return 'Ingen oppføring i disse feltene';
  }
}
export function additiveDifferenceSummary(row: ComparedAdditive): string {
  const inA = row.aEvidence !== 'not-recorded';
  const inB = row.bEvidence !== 'not-recorded';
  if (inA !== inB) return 'Bare oppført for produkt ' + (inA ? 'A' : 'B') + ' i de tilgjengelige feltene.';
  if (row.differs) return 'Oppført for begge, men ikke i de samme kildefeltene.';
  return 'Oppført for begge i de tilgjengelige feltene.';
}

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


export type KeyDifference = { key: string; label: string; description: string };
const DIFFERENCE_THRESHOLDS = { sugar: 0.5, protein: 0.5, salt: 0.05 } as const;

/**
 * A compact factual overview, deliberately not a ranking. Similar ingredients
 * wording is not proof of identical recipes; different wording is not proof
 * of different ingredients. Only compare explicitly available values.
 */
export function keyDifferences(a: FoodProduct, b: FoodProduct): KeyDifference[] {
  const results: KeyDifference[] = [];
  if (a.nova !== null && b.nova !== null && a.nova !== b.nova) {
    results.push({
      key: 'nova', label: 'Bearbeiding',
      description: 'A: NOVA ' + a.nova + ' · B: NOVA ' + b.nova
        + '. Dette er registrert bearbeidingsgrad, ikke en helsevurdering.',
    });
  } else if ((a.nova === null) !== (b.nova === null)) {
    results.push({
      key: 'nova-unknown', label: 'Bearbeiding',
      description: 'NOVA mangler for minst ett produkt. Vi kan ikke sammenligne bearbeidingsgraden sikkert.',
    });
  }
  for (const metric of ['sugar', 'protein', 'salt'] as const) {
    const x = a[metric], y = b[metric];
    if (x === null || y === null) continue;
    const delta = Math.abs(x - y);
    if (delta < DIFFERENCE_THRESHOLDS[metric]) continue;
    const label = metric === 'sugar' ? 'Sukkerarter' : metric === 'protein' ? 'Protein' : 'Salt';
    const note = metric === 'sugar' ? ' Sukkerarter kan være naturlig forekommende.' : '';
    results.push({
      key: metric, label,
      description: 'A: ' + amount(x) + ' · B: ' + amount(y)
        + '. Forskjell: ' + amount(delta) + ' per oppgitt 100 g / 100 ml.' + note,
    });
  }
  if (!a.ingredients || !b.ingredients) {
    results.push({
      key: 'missing-ingredients', label: 'Ingrediensdata',
      description: 'Ingredienslisten mangler for minst ett produkt. Vi kan ikke sammenligne hele innholdet.',
    });
  } else {
    const normalizeText = (value: string) => displayIngredientText(value).trim().toLowerCase().replace(/\s+/g, ' ');
    if (normalizeText(a.ingredients) !== normalizeText(b.ingredients)) {
      results.push({
        key: 'ingredients', label: 'Ingredienslister',
        description: 'Ingredienslistene har ulik ordlyd. Det bekrefter ikke i seg selv forskjellige ingredienser eller oppskrifter.',
      });
    }
  }
  const recorded = (tags: readonly string[]) =>
    [...new Set(tags.map(normalizeAdditive).filter((code): code is string => code !== null))].sort().join('|');
  const codesFromText = ingredientCodeEvidence(a.ingredients, a.additives).notInSeparateField.length > 0
    || ingredientCodeEvidence(b.ingredients, b.additives).notInSeparateField.length > 0;
  if (codesFromText) {
    results.push({
      key: 'e-code-data', label: 'Datakvalitet',
      description: 'Minst én E-kode nevnt i en ingrediensliste mangler med samme kode i datakildens separate E-kodefelt.',
    });
  } else if (recorded(a.additives) !== recorded(b.additives)) {
    results.push({
      key: 'e-codes', label: 'E-koder i datakilden',
      description: 'Det er registrert ulike E-koder for varene. Dette bekrefter ikke at alle tilsetningsstoffer er kartlagt.',
    });
  }
  if (results.length === 0) {
    return [{
      key: 'no-clear-differences', label: 'Ingen tydelige registrerte forskjeller',
      description: 'De kontrollerte feltene viser ingen tydelig forskjell. Det bekrefter ikke at varene er identiske.',
    }];
  }
  return results.slice(0, 4);
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
