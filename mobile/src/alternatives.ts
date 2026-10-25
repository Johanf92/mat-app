import { type FoodProduct, searchByCategory, searchProducts } from './openFoodFacts';
import { type Market } from './catalog';

/** A category describes a use case, never a health ranking. */
export type ProductKind = 'oat-barista' | 'oat-drink' | 'greek-plain' | 'plain-yogurt';
export type MatchProfile = {
  kind: ProductKind;
  label: string;
  category: string;
  fallback: string;
};
const fold = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'o');
function descriptiveText(p: FoodProduct): string {
  return fold([p.name, ...p.categories].join(' ').replace(/-/g, ' '));
}
function isOatBased(p: FoodProduct): boolean {
  const text = descriptiveText(p);
  const ingredients = fold(p.ingredients ?? '');
  return /\b(oat|oats|havre|hafer|avena)(?:\b|s)/.test(text + ' ' + ingredients)
    || (/oatly/.test(fold(p.brand)) && /ikaffe|oat|barista|kaffe/.test(text));
}
function isYogurt(p: FoodProduct): boolean {
  return /yogh?urt|yogur|jogur|skyr/.test(descriptiveText(p));
}
function greek(p: FoodProduct): boolean {
  return /gresk|greek|graesk|grekisk|griechisch|grecque|greco/.test(descriptiveText(p));
}
function flavoured(p: FoodProduct): boolean {
  // Explicit flavour terms only. An unflavoured food may naturally contain sugars.
  return /jordbaer|strawberry|vanil|vanilla|honning|honey|blueberry|blabaer|raspberry|bringebaer|mango|chocolate|sjokolade|kokos|coconut|peach|fersken|banan|frukt|fruit|lemon|sitron|caramel|karamell/.test(descriptiveText(p));
}
function isBarista(p: FoodProduct): boolean {
  return /barista|ikaffe|for coffee|til kaffe|coffee edition|kaffedrikk|kahvi/.test(descriptiveText(p));
}
function hasDrinkContext(p: FoodProduct): boolean {
  return /drink|drikke|melk|milk|beverage|barista|ikaffe|kaffe|coffee/.test(descriptiveText(p));
}
function isPlainYogurt(p: FoodProduct): boolean {
  const text = descriptiveText(p);
  return isYogurt(p) && !flavoured(p) &&
    (/naturell|natural|naturel|plain|unsweetened|uten sukker/.test(text) || greek(p));
}

/**
 * Prefer narrow, explainable categories. Product names and ingredients are used
 * conservatively when crowdsourced category tags are absent (e.g. Oatly iKaffe).
 */
export function productProfile(p: FoodProduct): MatchProfile | null {
  if (isOatBased(p) && hasDrinkContext(p)) {
    if (isBarista(p)) return {
      kind: 'oat-barista', label: 'havrebaserte kaffedrikker',
      category: 'en:oat-drinks', fallback: 'barista',
    };
    return {
      kind: 'oat-drink', label: 'havredrikker',
      category: 'en:oat-drinks', fallback: 'havredrikk',
    };
  }
  if (greek(p) && isPlainYogurt(p)) return {
    kind: 'greek-plain', label: 'naturell gresk yoghurt',
    category: 'en:greek-yogurts', fallback: 'gresk yoghurt',
  };
  if (isPlainYogurt(p) && isYogurt(p)) return {
    kind: 'plain-yogurt', label: 'naturell yoghurt',
    category: 'en:plain-yogurts', fallback: 'naturell yoghurt',
  };
  return null;
}
// Compatibility with the existing product screen.
export function comparableCategory(p: FoodProduct): string | null {
  return productProfile(p)?.category ?? null;
}
export function matchesProfile(p: FoodProduct, profile: MatchProfile): boolean {
  const candidate = productProfile(p);
  if (!candidate) return false;
  // A plain oat drink must not accidentally be compared with a barista drink,
  // and plain Greek yogurt must not be compared with fruit-flavoured yogurts.
  return candidate.kind === profile.kind;
}
function normalizedIdentity(p: FoodProduct): string {
  return fold(p.brand + '|' + p.name).replace(/[^a-z0-9|]/g, '');
}
function usableData(p: FoodProduct): boolean {
  const knownMacros = [p.protein, p.fat, p.carbs, p.sugar].filter(n => n !== null).length;
  return !!p.ingredients || knownMacros >= 2 || p.nova !== null;
}
function quality(p: FoodProduct): number {
  return (p.ingredients ? 3 : 0) + (p.nova !== null ? 1 : 0)
    + [p.protein, p.fat, p.carbs, p.sugar].filter(n => n !== null).length
    + (p.image ? 1 : 0);
}
export function relevantAlternatives(source: FoodProduct, options: FoodProduct[], market: Market): FoodProduct[] {
  const profile = productProfile(source);
  if (!profile) return [];
  const seen = new Set<string>([normalizedIdentity(source)]);
  const found: FoodProduct[] = [];
  for (const candidate of options) {
    if (candidate.code === source.code || (market.tag && !candidate.countries.includes(market.tag))
      || !matchesProfile(candidate, profile) || !usableData(candidate)) continue;
    const identity = normalizedIdentity(candidate);
    if (seen.has(identity)) continue;
    seen.add(identity);
    found.push(candidate);
  }
  return found.sort((a, b) => quality(b) - quality(a) || a.name.localeCompare(b.name, 'nb')).slice(0, 6);
}
/** Maximum two requests per click, cached by the OFF client. Never silently widen the selected market. */
export async function findAlternatives(source: FoodProduct, market: Market, signal?: AbortSignal): Promise<FoodProduct[]> {
  const profile = productProfile(source);
  if (!profile) return [];
  const viaCategory = await searchByCategory(profile.category, market, signal);
  let candidates = relevantAlternatives(source, viaCategory, market);
  if (candidates.length >= 4) return candidates;
  // OFF category tags are frequently missing. Full-text fallback is still
  // filtered by exact use-case and country in relevantAlternatives().
  const viaName = await searchProducts(profile.fallback, market, signal);
  candidates = relevantAlternatives(source, [...viaCategory, ...viaName], market);
  return candidates;
}
