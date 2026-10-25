import { DEFAULT_MARKET, numeric, readableText, type Market, type NovaGroup } from './catalog';
const BASE = 'https://world.openfoodfacts.org';
const FIELDS = [
  'code', 'product_name', 'product_name_no', 'product_name_nb', 'product_name_en',
  'brands', 'image_front_small_url', 'image_front_url', 'ingredients_text',
  'ingredients_text_no', 'ingredients_text_nb', 'ingredients_text_en', 'lang',
  'nova_group', 'nutriments', 'additives_tags', 'allergens_tags', 'quantity',
  'countries_tags', 'categories_tags', 'last_modified_t',
].join(',');
export type FoodProduct = {
  code: string; name: string; brand: string; image?: string; quantity?: string;
  ingredients?: string; ingredientsOriginal?: string; ingredientLanguage: string;
  nova: NovaGroup | null; protein: number | null; sugar: number | null;
  fat: number | null; carbs: number | null; fiber: number | null; salt: number | null;
  energy: number | null; additives: string[]; allergens: string[];
  countries: string[]; categories: string[]; modifiedAt: number | null;
};
type Raw = Record<string, unknown>;
function record(value: unknown): Raw { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {}; }
function tags(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string'))] : []; }
function first(...values: unknown[]): string { return values.map(readableText).find(Boolean) ?? ''; }
export function normalize(value: unknown): FoodProduct | null {
  const raw = record(value);
  const code = typeof raw.code === 'string' || typeof raw.code === 'number' ? String(raw.code).trim() : '';
  if (!/^\d{8,14}$/.test(code)) return null;
  const n = record(raw.nutriments);
  const nova = numeric(raw.nova_group);
  const ingredientKey = ['ingredients_text_nb', 'ingredients_text_no', 'ingredients_text', 'ingredients_text_en'].find(key => readableText(raw[key]));
  const ingredientLanguage = ingredientKey === 'ingredients_text_nb' || ingredientKey === 'ingredients_text_no'
    ? 'no' : ingredientKey === 'ingredients_text_en' ? 'en' : first(raw.lang) || 'unknown';
  const image = first(raw.image_front_url, raw.image_front_small_url);
  return {
    code, name: first(raw.product_name_nb, raw.product_name_no, raw.product_name, raw.product_name_en) || 'Produktnavn mangler',
    brand: first(raw.brands) || 'Merke ikke oppgitt', image: /^https:\/\//.test(image) ? image : undefined,
    quantity: first(raw.quantity) || undefined,
    ingredients: ingredientKey ? readableText(raw[ingredientKey]) : undefined,
    ingredientsOriginal: ingredientKey ? String(raw[ingredientKey]) : undefined, ingredientLanguage,
    nova: nova !== null && [1, 2, 3, 4].includes(nova) ? nova as NovaGroup : null,
    protein: numeric(n.proteins_100g), sugar: numeric(n.sugars_100g), fat: numeric(n.fat_100g),
    carbs: numeric(n.carbohydrates_100g), fiber: numeric(n.fiber_100g), salt: numeric(n.salt_100g),
    energy: numeric(n['energy-kcal_100g']), additives: tags(raw.additives_tags), allergens: tags(raw.allergens_tags),
    countries: tags(raw.countries_tags), categories: tags(raw.categories_tags), modifiedAt: numeric(raw.last_modified_t),
  };
}
export function buildSearchUrl(query: string, market: Market = DEFAULT_MARKET): string {
  // Keep the existing full-text endpoint. v2 search does not support free text.
  const params = new URLSearchParams({ search_simple: '1', action: 'process', json: '1',
    page_size: '20', page: '1', search_terms: query.trim(), fields: FIELDS, app_name: 'Matkontroll' });
  if (market.tag) {
    params.set('tagtype_0', 'countries');
    params.set('tag_contains_0', 'contains');
    params.set('tag_0', market.tag);
  }
  return BASE + '/cgi/search.pl?' + params;
}
export function buildProductUrl(barcode: string): string {
  // Deliberately no country filter: barcode lookup is global, even on holiday.
  return BASE + '/api/v2/product/' + encodeURIComponent(barcode) + '.json?fields=' + encodeURIComponent(FIELDS);
}
const cache = new Map<string, { until: number; value: unknown }>();
const requests: Record<'search' | 'product', number[]> = { search: [], product: [] };
function remember(key: string, value: unknown) {
  if (cache.size >= 80) cache.delete(cache.keys().next().value!);
  cache.set(key, { until: Date.now() + 5 * 60_000, value });
}
async function getJson(url: string, kind: 'search' | 'product', signal?: AbortSignal): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && cached.until > Date.now()) return cached.value;
  const now = Date.now();
  requests[kind] = requests[kind].filter(t => now - t < 60_000);
  // Leave some room for other clients sharing the same public IP.
  if (requests[kind].length >= (kind === 'search' ? 8 : 12)) throw new Error('Mange oppslag på kort tid. Vent ett minutt og prøv igjen.');
  if (signal?.aborted) throw new Error('Avbrutt');
  requests[kind].push(now);
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 20_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: {
      Accept: 'application/json', 'User-Agent': 'Matkontroll/0.1 (https://github.com/Johanf92/mat-app)',
    } });
    if (response.status === 404 && kind === 'product') return { status: 0 };
    if (response.status === 429) throw new Error('Open Food Facts ber oss vente litt. Prøv igjen om ett minutt.');
    if (!response.ok) throw new Error('Open Food Facts er midlertidig utilgjengelig. Prøv igjen senere.');
    const result: unknown = await response.json();
    remember(url, result);
    return result;
  } catch (error) {
    if (timedOut) throw new Error('Oppslaget tok for lang tid. Prøv igjen.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
export async function searchProducts(query: string, market: Market = DEFAULT_MARKET, signal?: AbortSignal): Promise<FoodProduct[]> {
  if (query.trim().length < 2) return [];
  const data = record(await getJson(buildSearchUrl(query, market), 'search', signal));
  const products = (Array.isArray(data.products) ? data.products : []).map(normalize).filter((p): p is FoodProduct => p !== null);
  // Defense in depth: do not silently show another market if the upstream filter fails.
  return [...new Map(products.filter(p => !market.tag || p.countries.includes(market.tag)).map(p => [p.code, p])).values()];
}
export async function getProduct(barcode: string, signal?: AbortSignal): Promise<FoodProduct | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;
  const data = record(await getJson(buildProductUrl(barcode), 'product', signal));
  return data.status === 1 ? normalize({ ...record(data.product), code: record(data.product).code ?? barcode }) : null;
}

export function buildCategoryUrl(category: string, market: Market = DEFAULT_MARKET): string {
 const params = new URLSearchParams({
  categories_tags: category, fields: FIELDS, page_size: '60', page: '1', sort_by: 'popularity_key'
 });
 // The v2 structured search reference documents countries_tags_en.
 if (market.tag) params.set('countries_tags_en', market.tag.replace(/^en:/, ''));
 return BASE + '/api/v2/search?' + params.toString();
}
export async function searchByCategory(category: string, market: Market = DEFAULT_MARKET, signal?: AbortSignal): Promise<FoodProduct[]> {
 if (!/^en:[a-z0-9-]+$/.test(category)) return [];
 const data = record(await getJson(buildCategoryUrl(category, market), 'search', signal));
 const products = (Array.isArray(data.products) ? data.products : []).map(normalize).filter((p): p is FoodProduct => p !== null);
 // Never silently widen the selected market if the upstream filter is ignored.
 return [...new Map(products.filter(p => p.categories.includes(category) && (!market.tag || p.countries.includes(market.tag))).map(p => [p.code, p])).values()];
}
