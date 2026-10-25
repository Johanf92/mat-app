import { type FoodProduct, searchProducts } from './openFoodFacts';
import { type Market } from './catalog';

/**
 * Categories here describe a practical use case, never a nutritional or
 * safety ranking. Unknown variants stay out of automatic recommendations.
 */
export type ProductKind =
  | 'oat-barista' | 'oat-drink' | 'greek-plain' | 'plain-yogurt'
  | 'cola-regular' | 'cola-sugar-free';
export type MatchProfile = {
  kind: ProductKind;
  label: string;
  category: string;
  fallback: string;
};
const fold = (text: string) => text.toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'o');
const textOf = (p: FoodProduct) => fold([p.name, ...p.categories].join(' ').replace(/-/g, ' '));

function isOatBased(p: FoodProduct): boolean {
  const text = textOf(p);
  const ingredients = fold(p.ingredients ?? '');
  return /\b(oat|havre|hafer|avena)[a-z]*/.test(text + ' ' + ingredients)
    || (/oatly/.test(fold(p.brand)) && /ikaffe|oat|barista|kaffe/.test(text));
}
function isBarista(p: FoodProduct): boolean {
  return /barista|ikaffe|for coffee|til kaffe|coffee edition|kaffedrikk|kahvi/.test(textOf(p));
}
function isYogurt(p: FoodProduct): boolean {
  // Skyr has a different typical use/texture; don't auto-match it to yoghurt.
  return /yogh?urt|yogur|jogur/.test(textOf(p)) && !/\bskyr\b/.test(textOf(p));
}
function isGreek(p: FoodProduct): boolean {
  return /gresk|greek|graesk|grekisk|griechisch|grecque|greco/.test(textOf(p));
}
function hasFlavourLabel(p: FoodProduct): boolean {
  return /jordbaer|strawberry|vanil|vanilla|honning|honey|blueberry|blabaer|raspberry|bringebaer|mango|chocolate|sjokolade|kokos|coconut|peach|fersken|banan|frukt|fruit|lemon|sitron|caramel|karamell|\b(flavoured|flavored|flavour|flavor|smaksatt|sotet|sweetened|aromatisert)\b/.test(textOf(p));
}
function explicitlyPlain(p: FoodProduct): boolean {
  return /\b(naturell|natural|naturel|plain|unsweetened|usotet|unflavoured|unflavored)\b/.test(textOf(p))
    || p.categories.some(x => ['en:plain-yogurts', 'en:natural-yogurts', 'en:plain-greek-yogurts'].includes(x));
}
function plainDairyIngredients(p: FoodProduct): boolean {
  // A name like "Gresk yoghurt" is ambiguous. When the full ingredient list is
  // available, a short milk+culture list can provide corroborating evidence.
  // This is deliberately not an allergen or dietary-safety assessment.
  const text = fold(p.ingredients ?? '');
  return text.length > 0 && text.length < 220
    && /\b(melk|milk|flote|cream)\b/.test(text)
    && /(kultur|culture|cultures|ferment|melkesyrebakter)/.test(text)
    && !/(sukker|sugar|sirup|syrup|glukose|dextrose|honning|honey|syltetoy|jam|fruit|frukt|baer|berry|vanil|vanilla|aroma|flavo|sweeten|sotstoff|sotning|aspartam|stevia)/.test(text);
}
function plainYogurt(p: FoodProduct): boolean {
  return isYogurt(p) && !hasFlavourLabel(p)
    && (explicitlyPlain(p) || plainDairyIngredients(p));
}
function isDrink(p: FoodProduct): boolean {
  return /\b(drink|drikke|melk|milk|beverage|barista|ikaffe|kaffe|coffee)/.test(textOf(p));
}
function colaProfile(p: FoodProduct): MatchProfile | null {
  const name = fold(p.name);
  const category = fold(p.categories.join(' '));
  const namedCola = /coca[\s-]*cola|cocacola|\bcola\b|\bpepsi\b|\bcoke\b/.test(name);
  const categoryCola = p.categories.some(tag => ['en:colas', 'en:cola-soft-drinks'].includes(tag));
  if (!namedCola && !categoryCola) return null;

  // Avoid sweets and novelty/energy/flavoured variants: all may contain "cola"
  // but are not interchangeable with an ordinary cola at the shop.
  if (/gummi|gummy|candy|sweets|godteri|pastill|is(?:krem)?\b|ice cream|sorbet|syrup|sirup/.test(name)
    || /cola-flavo|cola-flavo[u]?red|cola-flavoured/.test(category)
    || /dreamworld|intergalactic|starlight|spiced|energy|energi|creation|limited|marshmello|cherry|kirsebaer|vanil|vanilla|lime|lemon|sitron|mango|raspberry|jordbaer|strawberry|tropical|tropic|caffeine[\s-]*free|koffeinfri|koffeinfritt|coffee|kaffe/.test(name)) return null;
  const sugarFree = /\b(zero|diet|light|lite|max|sukkerfri|sukkerfritt|sugar[\s-]*free|sugarfree|no sugar|uten sukker)\b/.test(name);
  // Explicitly sugar-free variants are not compared to ordinary cola.
  if (sugarFree) return {
    kind: 'cola-sugar-free', label: 'sukkerfri cola',
    category: 'en:colas', fallback: 'cola zero',
  };
  // If the source itself reports zero sugar with no variant label, we cannot
  // confidently assume it is ordinary cola (the record may be mislabelled).
  if (p.sugar === 0) return null;
  return {
    kind: 'cola-regular', label: 'vanlig cola',
    category: 'en:colas', fallback: 'cola',
  };
}

/**
 * Conservative, explainable product profiles. Do not classify a yoghurt as
 * "naturell" solely because the title contains "gresk yoghurt".
 */
export function productProfile(p: FoodProduct): MatchProfile | null {
  const cola = colaProfile(p);
  if (cola) return cola;

  if (isOatBased(p) && isDrink(p)) {
    if (isBarista(p) && !hasFlavourLabel(p)) return {
      kind: 'oat-barista', label: 'havrebaserte kaffedrikker',
      category: 'en:oat-drinks', fallback: 'barista',
    };
    if (isBarista(p)) return null;
    return {
      kind: 'oat-drink', label: 'havredrikker',
      category: 'en:oat-drinks', fallback: 'havredrikk',
    };
  }
  if (isGreek(p) && plainYogurt(p)) return {
    kind: 'greek-plain', label: 'naturell gresk yoghurt',
    category: 'en:greek-yogurts', fallback: 'gresk yoghurt',
  };
  if (!isGreek(p) && plainYogurt(p)) return {
    kind: 'plain-yogurt', label: 'naturell yoghurt',
    category: 'en:plain-yogurts', fallback: 'naturell yoghurt',
  };
  return null;
}
export function comparableCategory(p: FoodProduct): string | null {
  return productProfile(p)?.category ?? null;
}
export function matchesProfile(p: FoodProduct, profile: MatchProfile): boolean {
  return productProfile(p)?.kind === profile.kind;
}
function identity(p: FoodProduct): string {
  // Separate brands with the same name, but remove case/punctuation duplicates.
  return fold(p.brand + '|' + p.name).replace(/[^a-z0-9|]/g, '');
}
function usableData(p: FoodProduct): boolean {
  return !!p.ingredients || [p.protein, p.fat, p.carbs, p.sugar].some(n => n !== null)
    || p.nova !== null;
}
function quality(p: FoodProduct): number {
  return (p.ingredients ? 3 : 0)
    + [p.protein, p.fat, p.carbs, p.sugar].filter(n => n !== null).length
    + (p.image ? 1 : 0) + (p.nova !== null ? 1 : 0);
}
function exactLabelMatch(p: FoodProduct, kind: ProductKind): number {
  if (kind === 'greek-plain' || kind === 'plain-yogurt') return explicitlyPlain(p) ? 2 : 0;
  if (kind === 'cola-regular') return /\b(original|classic|klassisk)\b/.test(textOf(p)) ? 1 : 0;
  if (kind === 'cola-sugar-free') return /\b(zero|sukkerfri|sugar free)\b/.test(textOf(p)) ? 1 : 0;
  return 0;
}

/** Returns concrete suggestions only if the product type and selected market match. */
export function relevantAlternatives(source: FoodProduct, options: FoodProduct[], market: Market): FoodProduct[] {
  const profile = productProfile(source);
  if (!profile) return [];
  const seen = new Set<string>([identity(source)]);
  const found: FoodProduct[] = [];
  for (const p of options) {
    if (p.code === source.code || (market.tag && !p.countries.includes(market.tag))
      || !matchesProfile(p, profile) || !usableData(p)) continue;
    const key = identity(p);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(p);
  }
  return found.sort((a, b) =>
    exactLabelMatch(b, profile.kind) - exactLabelMatch(a, profile.kind)
    || quality(b) - quality(a) || a.name.localeCompare(b.name, 'nb')
  ).slice(0, 6);
}

/** Explains surprising data without claiming that a candidate is unhealthy. */
export function candidateNote(source: FoodProduct, candidate: FoodProduct): string | null {
  const a = productProfile(source), b = productProfile(candidate);
  if (!a || !b || a.kind !== b.kind) return null;
  if ((a.kind === 'greek-plain' || a.kind === 'plain-yogurt')
    && source.carbs !== null && candidate.carbs !== null
    && Math.abs(source.carbs - candidate.carbs) >= 7) {
    return 'Stor forskjell i karbohydrater. Kontroller variant og næringsverdier.';
  }
  if (!candidate.ingredients) return 'Ingredienslisten bør kontrolleres på emballasjen.';
  return null;
}

/**
 * Single country-filtered full-text search. Norwegian search index records may
 * be stale or incomplete; suggestions can be absent even for stocked products.
 */
export async function findAlternatives(source: FoodProduct, market: Market, signal?: AbortSignal): Promise<FoodProduct[]> {
  const profile = productProfile(source);
  if (!profile) return [];
  const candidates = await searchProducts(profile.fallback, market, signal);
  return relevantAlternatives(source, candidates, market);
}
