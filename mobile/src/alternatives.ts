import { type FoodProduct, searchProducts } from './openFoodFacts';
import { type Market } from './catalog';

/**
 * Categories here describe a practical use case, never a nutritional or
 * safety ranking. Unknown variants stay out of automatic recommendations.
 */
export type ProductKind =
  | 'oat-barista' | 'oat-drink' | 'greek-plain' | 'plain-yogurt'
  | 'cola-regular' | 'cola-sugar-free' | 'kefir-plain'
  | 'skyr-plain' | 'cottage-cheese-plain'
  | 'oats-plain' | 'oats-gluten-free'
  | 'milk-low-fat' | 'milk-whole';
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
    && /(melk|milk|flote|cream)/.test(text)
    && /(kultur|culture|cultures|ferment|melkesyrebakter)/.test(text)
    && !/(sukker|sugar|sirup|syrup|glukose|dextrose|honning|honey|syltetoy|jam|fruit|frukt|baer|berry|vanil|vanilla|aroma|flavo|sweeten|sotstoff|sotning|aspartam|stevia)/.test(text);
}
function plainYogurt(p: FoodProduct): boolean {
  return isYogurt(p) && !hasFlavourLabel(p)
    && (explicitlyPlain(p) || plainDairyIngredients(p));
}
function isDrink(p: FoodProduct): boolean {
  return /(drink|drikke|drikk|melk|milk|beverage|barista|ikaffe|kaffe|coffee)/.test(textOf(p));
}

/**
 * These are narrow, name-led matches. Broad tags such as "dairy" and "cereals"
 * must never make unrelated foods automatic substitutes.
 */
export function labeledGlutenFree(p: FoodProduct): boolean {
  return /glutenfri|gluten[\s-]*free|sans gluten|glutenfrei/.test(textOf(p))
    || p.categories.some(tag=>/gluten-free/.test(tag));
}
function hasSweetExtras(p: FoodProduct): boolean {
  const s=fold(p.ingredients ?? '');
  return /sukker|sugar|sirup|syrup|honning|honey|frukt|fruit|baer|berry|jordbaer|vanil|vanilla|kakao|cocoa|sjokolade|chocolate|aroma|sweeten|sotstoff|flavour|flavor/.test(s);
}
function skyrProfile(p: FoodProduct): MatchProfile | null {
  const n=fold(p.name);
  if(!/(^|[^a-z])skyr(?=$|[^a-z])/.test(n)
      || /drikk|drink|shake|smoothie|is(krem)?|dessert/.test(n)
      || hasFlavourLabel(p) || hasSweetExtras(p)) return null;
  if(!explicitlyPlain(p) && !plainDairyIngredients(p)) return null;
  return {kind:'skyr-plain',label:'skyr naturell',category:'en:skyrs',fallback:'skyr'};
}
function cottageCheeseProfile(p: FoodProduct): MatchProfile | null {
  const n=fold(p.name);
  if(!/cottage[\s-]*cheese|hytteost/.test(n)
      || /smak|med |urter|gresslok|chili|chilli|pesto|hvitlok|garlic|pepper|tomat|tomato|olive|oliven/.test(n)
      || hasFlavourLabel(p) || hasSweetExtras(p)) return null;
  if(!explicitlyPlain(p) && !/\b(original|classic)\b/.test(n) && !plainDairyIngredients(p)) return null;
  return {kind:'cottage-cheese-plain',label:'cottage cheese naturell',category:'en:cottage-cheeses',fallback:'cottage cheese'};
}
function oatsProfile(p: FoodProduct): MatchProfile | null {
  const n=fold(p.name);
  if(!/(^|[^a-z])(havregryn|rolled[\s-]*oats|oat[\s-]*flakes)(?=$|[^a-z])/.test(n)
    || hasFlavourLabel(p) || /gr[yø]t|porridge|muesli|musli|granola|kjeks|cookie|bar|blanding|mix|med |kanel|cinnamon|fr[oø]|seed|frukt|fruit|protein/.test(n)) return null;
  // The named product must look like unflavoured oats. If an ingredient list
  // exists, reject extra ingredients rather than treating a mixture as oats.
  const ingredient=fold(p.ingredients ?? '').replace(/[_.]/g,' ').trim();
  if(ingredient && !/^(?:okologisk(?:e)?\s+)?(?:glutenfri(?:e)?\s+)?(?:fullkorn\s+)?(?:havregryn|havre|rolled oats|oat flakes)(?:\s*100\s*%?)?[\s,;]*$/.test(ingredient))
    return null;
  const glutenFree=labeledGlutenFree(p);
  return glutenFree
    ? {kind:'oats-gluten-free',label:'havregryn merket glutenfri',category:'en:rolled-oats',fallback:'glutenfri havregryn'}
    : {kind:'oats-plain',label:'havregryn',category:'en:rolled-oats',fallback:'havregryn'};
}
function milkProfile(p: FoodProduct): MatchProfile | null {
  const n=fold(p.name);
  const kind: ProductKind | null =
    /(^|[^a-z])lettmelk(?=$|[^a-z])/.test(n) ? 'milk-low-fat'
    : /(^|[^a-z])helmelk(?=$|[^a-z])/.test(n) ? 'milk-whole' : null;
  if(!kind || hasFlavourLabel(p) || /smak|sjoko|kakao|cocoa|chocolate|jordbaer|vanil|coffee|kaffe|shake|drikk|yoghurt|kefir/.test(n)
      || hasSweetExtras(p)) return null;
  // "Milk" in plant-based category tags must not override an explicitly
  // named dairy product unless we can corroborate the actual ingredient.
  const t=textOf(p)+' '+fold(p.ingredients ?? '');
  if(/(^|[^a-z])(havre|oat|soya|soy|mandel|almond|kokos|coconut|risdrikk|rice drink)(?=$|[^a-z])/.test(t))return null;
  return kind==='milk-low-fat'
    ? {kind,label:'lettmelk',category:'en:semi-skimmed-milks',fallback:'lettmelk'}
    : {kind,label:'helmelk',category:'en:whole-milks',fallback:'helmelk'};
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

function kefirProfile(p: FoodProduct): MatchProfile | null {
  const name = fold(p.name);
  const categorization = textOf(p);
  if (!/\bkefir\b/.test(name)) return null;
  // Water kefir and fruit-flavoured products are different types of drinks.
  if (/vannkefir|water[\s-]*kefir|kefir[\s-]*water|vann[\s-]*kefir/.test(categorization)
      || hasFlavourLabel(p)
      || /\b(sukker|sugar|sirup|syrup|honning|honey|frukt|fruit|juice|saft)\b/.test(fold(p.ingredients ?? ''))) return null;
  return { kind: 'kefir-plain', label: 'naturell kefir',
    category: 'en:kefirs', fallback: 'kefir' };
}

/**
 * Conservative, explainable product profiles. Do not classify a yoghurt as
 * "naturell" solely because the title contains "gresk yoghurt".
 */
export function productProfile(p: FoodProduct): MatchProfile | null {
  const cola = colaProfile(p);
  if (cola) return cola;
  const kefir = kefirProfile(p);
  if (kefir) return kefir;
  for(const profile of [skyrProfile, cottageCheeseProfile, oatsProfile, milkProfile]){
    const match=profile(p);
    if(match)return match;
  }

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

/**
 * Two products may be excellent manual comparisons even when they should not
 * be suggested as automatic like-for-like replacements.
 */
export function relatedVariantComparisonNote(a: FoodProduct, b: FoodProduct): string | null {
  const left = productProfile(a)?.kind;
  const right = productProfile(b)?.kind;
  if (left === 'cola-regular' && right === 'cola-sugar-free')
    return 'Begge er cola, men produkt A er vanlig cola og produkt B er sukkerfri cola. Dette er en relevant sammenligning av ulike varianter, ikke av identiske oppskrifter.';
  if (left === 'cola-sugar-free' && right === 'cola-regular')
    return 'Begge er cola, men produkt A er sukkerfri cola og produkt B er vanlig cola. Dette er en relevant sammenligning av ulike varianter, ikke av identiske oppskrifter.';
  if ((left === 'milk-low-fat' && right === 'milk-whole') || (left === 'milk-whole' && right === 'milk-low-fat'))
    return 'Begge er melk, men den ene er lettmelk og den andre helmelk. Sammenlign gjerne fettinnhold og energi; dette er ulike varianter.';
  if ((left === 'oats-plain' && right === 'oats-gluten-free') || (left === 'oats-gluten-free' && right === 'oats-plain'))
    return 'Begge er havregryn, men bare én variant er registrert som glutenfri. Dette er ikke dokumentasjon på at den andre er egnet ved cøliaki. Kontroller emballasjen.';
  return null;
}
/** Only a label claim, not a test of lactose content or milk allergen safety. */
export function labeledLactoseFree(p: FoodProduct): boolean {
  const name = fold(p.name);
  return /laktosefri|lactose[\s-]*free|laktosfri|laktosefrei|sin lactosa|sans lactose/.test(name)
    || p.categories.some(tag => /lactose-free|lactosefree/.test(tag));
}
function brandFamily(p: FoodProduct): string | null {
  const brand = fold(p.brand).replace(/[^a-z0-9]+/g, ' ').trim();
  const name = fold(p.name).replace(/[^a-z0-9]+/g, ' ').trim();
  if (/^coca cola\b/.test(brand) || /^coca cola\b/.test(name)) return 'coca-cola';
  if (/^pepsi\b/.test(brand) || /^pepsi\b/.test(name)) return 'pepsi';
  const first = brand.split(' ')[0];
  return !first || ['merke', 'unknown', 'ikke', 'unspecified'].includes(first) ? null : first;
}
/**
 * Group only well-supported lookalikes. For cola, different package sizes of
 * one producer's ordinary recipe are not useful automatic alternatives.
 * For yoghurts, group same brand, same lactose-free label status and same
 * documented nutrition; unknown values must not be silently treated as equal.
 */
function variantKey(p: FoodProduct, kind: ProductKind): string {
  const brand = brandFamily(p);
  if (!brand) return identity(p);
  if (kind === 'cola-regular') return kind + '|' + brand;
  if (kind === 'cola-sugar-free') {
    // Light and Zero are both sugar-free, but their formulations can differ.
    // Only collapse package-size duplicates of the *same* named variant.
    const name = fold(p.name);
    const variant = /\b(light|diet|lite)\b/.test(name) ? 'light'
      : /\bzero\b/.test(name) ? 'zero'
      : /\bmax\b/.test(name) ? 'max' : 'unspecified';
    return kind + '|' + brand + '|' + variant;
  }
  if (kind === 'greek-plain' || kind === 'plain-yogurt' || kind === 'kefir-plain'
    || kind === 'skyr-plain' || kind === 'cottage-cheese-plain'
    || kind === 'milk-low-fat' || kind === 'milk-whole') {
    const metrics = [p.energy, p.protein, p.fat, p.carbs, p.sugar];
    if (metrics.filter(v => v !== null).length < 3) return identity(p);
    return kind + '|' + brand + '|' + (labeledLactoseFree(p) ? 'lactose-free' : 'unspecified')
      + '|' + metrics.map(v => v === null ? '?' : v.toFixed(3)).join('|');
  }
  return identity(p);
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
  if (kind === 'greek-plain' || kind === 'plain-yogurt'
    || kind === 'skyr-plain' || kind === 'cottage-cheese-plain') return explicitlyPlain(p) ? 2 : 0;
  if (kind === 'kefir-plain') return /\b(naturell|plain|natural)\b/.test(textOf(p)) ? 2 : 0;
  if (kind === 'cola-regular') return /\b(original|classic|klassisk)\b/.test(textOf(p)) ? 1 : 0;
  if (kind === 'cola-sugar-free') return /\b(zero|sukkerfri|sugar free)\b/.test(textOf(p)) ? 1 : 0;
  return 0;
}

/** Returns concrete suggestions only if the product type and selected market match. */
export function relevantAlternatives(source: FoodProduct, options: FoodProduct[], market: Market): FoodProduct[] {
  const profile = productProfile(source);
  if (!profile) return [];
  // Choose the best documented member BEFORE folding duplicate records.
  const sorted = options.filter(p =>
    p.code !== source.code && (!market.tag || p.countries.includes(market.tag))
    && matchesProfile(p, profile) && usableData(p)
    // A missing "laktosefri" label must never be treated as a safe
    // substitution for milk explicitly labelled lactose-free.
    && (!['milk-low-fat','milk-whole'].includes(profile.kind)
      || labeledLactoseFree(source)===labeledLactoseFree(p))
  ).sort((a, b) =>
    exactLabelMatch(b, profile.kind) - exactLabelMatch(a, profile.kind)
    || quality(b) - quality(a) || a.name.localeCompare(b.name, 'nb')
  );
  const seen = new Set<string>([identity(source), variantKey(source, profile.kind)]);
  const found: FoodProduct[] = [];
  for (const p of sorted) {
    const key = variantKey(p, profile.kind);
    if (seen.has(key) || seen.has(identity(p))) continue;
    seen.add(key);
    seen.add(identity(p));
    found.push(p);
    if (found.length === 6) break;
  }
  return found;
}

/** Explains surprising data without claiming that a candidate is unhealthy. */
export function candidateNote(source: FoodProduct, candidate: FoodProduct): string | null {
  const a = productProfile(source), b = productProfile(candidate);
  if (!a || !b || a.kind !== b.kind) return null;
  if (['greek-plain','plain-yogurt','kefir-plain','skyr-plain','cottage-cheese-plain'].includes(a.kind)) {
    if (labeledLactoseFree(source) && !labeledLactoseFree(candidate))
      return 'Denne varianten er ikke registrert som laktosefri. Kontroller emballasjen før du vurderer den som erstatning. Laktosefri betyr ikke melkefri.';
    if (!labeledLactoseFree(source) && labeledLactoseFree(candidate))
      return 'Dette forslaget er merket laktosefri. Det forteller ikke om produktet er melkefritt.';
  }
  if ((a.kind === 'greek-plain' || a.kind === 'plain-yogurt' || a.kind === 'skyr-plain')
    && source.carbs !== null && candidate.carbs !== null
    && Math.abs(source.carbs - candidate.carbs) >= 7) {
    return 'Stor forskjell i karbohydrater. Kontroller variant og næringsverdier.';
  }
  // Missing ingredient data in a search hit is common; explain that once in the
  // results footer rather than clutter every candidate card.
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
