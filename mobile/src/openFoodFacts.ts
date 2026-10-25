import { DEFAULT_MARKET, numeric, readableText, type Market, type NovaGroup } from './catalog';
import { parseNutriScore, type NutriScoreGrade } from './nutriScore';
const BASE = 'https://world.openfoodfacts.org';
const SEARCH_BASE = 'https://search.openfoodfacts.org';
// Search-a-licious is a separate, Lucene-based search service. Its result shape
// uses "hits", unlike the legacy CGI search and product lookup endpoints.
const SEARCH_FIELDS = 'code,product_name,product_name_nb,product_name_no,product_name_en,brands,countries_tags,categories_tags,nova_group,nutriments,ingredients_text,ingredients_text_nb,ingredients_text_no,ingredients_text_en,image_front_url,image_front_small_url,additives_tags,allergens_tags,quantity,nutriscore_grade,nutrition_grades';
const FIELDS = [
  'code', 'product_name', 'product_name_no', 'product_name_nb', 'product_name_en',
  'brands', 'image_front_small_url', 'image_front_url', 'ingredients_text',
  'ingredients_text_no', 'ingredients_text_nb', 'ingredients_text_en', 'lang',
  'nova_group', 'nutriscore_grade', 'nutrition_grades', 'nutriments', 'additives_tags', 'allergens_tags', 'quantity',
  'countries_tags', 'categories_tags', 'last_modified_t',
].join(',');
export type FoodProduct = {
  code: string; name: string; brand: string; image?: string; quantity?: string;
  ingredients?: string; ingredientsOriginal?: string; ingredientLanguage: string;
  nova: NovaGroup | null; nutriScore: NutriScoreGrade | null; protein: number | null; sugar: number | null;
  fat: number | null; carbs: number | null; fiber: number | null; salt: number | null;
  energy: number | null;
  /** True only when kcal was absent and we converted OFF's energy_100g (kJ). */
  energyConvertedFromKJ?: boolean;
  /** The two explicitly registered kcal/kJ values materially disagree; keep both untouched. */
  energyKJConflict?: boolean;
  additives: string[]; allergens: string[];
  countries: string[]; categories: string[]; modifiedAt: number | null;
};
type Raw = Record<string, unknown>;
function record(value: unknown): Raw { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {}; }
function tags(value: unknown): string[] { return Array.isArray(value) ? [...new Set(value.filter((x): x is string => typeof x === 'string'))] : []; }
function first(...values: unknown[]): string {
 for (const value of values) {
  if (typeof value === 'string') { const text = readableText(value); if (text) return text; }
  if (Array.isArray(value)) { const text = first(...value); if (text) return text; }
  if (value && typeof value === 'object') {
   const r = record(value);
   const text = first(r.nb, r.no, r.en, r.main);
   if (text) return text;
  }
 }
 return '';
}
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
  const directKcal=numeric(n['energy-kcal_100g']);
  // Open Food Facts' energy_100g is standardized to kJ. Converting that
  // explicitly reported value is a unit conversion, not a nutrition estimate.
  // Never replace an explicitly reported 0 kcal, and don't silently reconcile
  // contradictory source values.
  const energyKJ=numeric(n.energy_100g);
  const energyConvertedFromKJ=directKcal===null && energyKJ!==null;
  const energy=directKcal!==null?directKcal
    :energyKJ!==null?Math.round((energyKJ/4.184)*10)/10:null;
  const discrepancy=directKcal!==null&&energyKJ!==null
    ?Math.abs(directKcal-energyKJ/4.184):0;
  const energyKJConflict=directKcal!==null&&energyKJ!==null
    &&discrepancy>Math.max(20,Math.max(directKcal,energyKJ/4.184)*0.35);
  return {
    code, name: first(raw.product_name_nb, raw.product_name_no, raw.product_name, raw.product_name_en) || 'Produktnavn mangler',
    brand: first(raw.brands) || 'Merke ikke oppgitt', image: /^https:\/\//.test(image) ? image : undefined,
    quantity: first(raw.quantity) || undefined,
    ingredients: ingredientKey ? readableText(raw[ingredientKey]) : undefined,
    ingredientsOriginal: ingredientKey ? String(raw[ingredientKey]) : undefined, ingredientLanguage,
    nova: nova !== null && [1, 2, 3, 4].includes(nova) ? nova as NovaGroup : null,
    // Prefer the current OFF field. An explicit "unknown"/"not-applicable"
    // must not fall through to an obsolete legacy grade.
    nutriScore: parseNutriScore(raw.nutriscore_grade ?? raw.nutrition_grades ?? raw.nutrition_grade_fr),
    protein: numeric(n.proteins_100g), sugar: numeric(n.sugars_100g), fat: numeric(n.fat_100g),
    carbs: numeric(n.carbohydrates_100g), fiber: numeric(n.fiber_100g), salt: numeric(n.salt_100g),
    energy, energyConvertedFromKJ, energyKJConflict,
    additives: tags(raw.additives_tags), allergens: tags(raw.allergens_tags),
    countries: tags(raw.countries_tags), categories: tags(raw.categories_tags), modifiedAt: numeric(raw.last_modified_t),
  };
}
// User text is treated as search terms, never as Lucene query syntax.
function safeSearchText(text: string): string {
 return text.normalize('NFKC')
  .replace(/[+!(){}\[\]^"~*?:\\/|&;=-]/g, ' ')
  .replace(/\s+/g, ' ').trim();
}
function searchQuery(text: string, market: Market): string {
 const query = safeSearchText(text);
 // Country is a server-side filter *and* separately validated after receiving hits.
 return market.tag ? query + ' countries_tags:"' + market.tag + '"' : query;
}
function searchUrl(q: string, pageSize: number): string {
 const params = new URLSearchParams({
  q, page_size: String(pageSize), page: '1', langs: 'no,en', fields: SEARCH_FIELDS
 });
 return SEARCH_BASE + '/search?' + params.toString();
}
export function buildSearchUrl(query: string, market: Market = DEFAULT_MARKET): string {
 return searchUrl(searchQuery(query, market), 40);
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
    if (!response.ok) {
      if (response.status === 503 || response.status === 502 || response.status === 504)
        throw new Error(kind === 'search' ? 'Søketjenesten svarer ikke akkurat nå. Prøv igjen om litt, eller bruk strekkoden.' : 'Produktdatabasen svarer ikke akkurat nå. Prøv igjen litt senere.');
      throw new Error('Kunne ikke hente opplysninger (HTTP ' + response.status + '). Prøv igjen.');
    }
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
/**
 * A barcode can appear multiple times in an index response. Use one complete
 * source record, never a synthetic combination of old and new field values.
 * Prefer documentation and internally consistent nutrition, not the last hit,
 * Nutri-Score grade, NOVA number or a particular dietary outcome.
 */
function searchRecordDocumentation(p:FoodProduct):number {
 const available=[p.energy,p.protein,p.fat,p.carbs,p.sugar,p.fiber,p.salt]
   .filter(v=>v!==null).length;
 const contradictions=(p.sugar!==null&&p.carbs!==null&&p.sugar>p.carbs+0.1?1:0)
   +(p.energy===0&&[p.protein,p.fat,p.carbs].some(x=>x!==null&&x>=1)?1:0)
   +(p.energyKJConflict?1:0);
 return available*2+(p.ingredients?.trim()?5:0)
   +(p.nova!==null?2:0)+(p.nutriScore!==null?1:0)
   +(p.image?2:0)
   +(p.name!=='Produktnavn mangler'?2:0)
   +(p.brand!=='Merke ikke oppgitt'?1:0)
   -contradictions*40;
}
export function searchResults(data: unknown, market: Market): FoodProduct[] {
 const payload = record(data);
 if (!Array.isArray(payload.hits)) throw new Error('Søketjenesten ga et uventet svar. Prøv igjen senere.');
 const results = payload.hits.map(normalize).filter((p): p is FoodProduct => p !== null);
 // A stale search hit never overrides the selected market. Preserve the order
 // of first-seen barcodes, while retaining the best-documented entire record.
 const deduplicated=new Map<string,FoodProduct>();
 for(const p of results){
  if(market.tag && !p.countries.includes(market.tag))continue;
  const prior=deduplicated.get(p.code);
  if(!prior||searchRecordDocumentation(p)>searchRecordDocumentation(prior))
    deduplicated.set(p.code,p);
 }
 return [...deduplicated.values()];
}
export async function searchProducts(query: string, market: Market = DEFAULT_MARKET, signal?: AbortSignal): Promise<FoodProduct[]> {
 if (safeSearchText(query).length < 2) return [];
 return searchResults(await getJson(buildSearchUrl(query, market), 'search', signal), market);
}
export async function getProduct(barcode: string, signal?: AbortSignal): Promise<FoodProduct | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;
  const data = record(await getJson(buildProductUrl(barcode), 'product', signal));
  return data.status === 1 ? normalize({ ...record(data.product), code: record(data.product).code ?? barcode }) : null;
}

export function buildCategoryUrl(category: string, market: Market = DEFAULT_MARKET): string {
 if (!/^en:[a-z0-9-]+$/.test(category)) throw new Error('Ugyldig kategori.');
 // Search-a-licious supports filter clauses in its q parameter.
 const q = 'categories_tags:"' + category + '"' + (market.tag ? ' countries_tags:"' + market.tag + '"' : '');
 return searchUrl(q, 60);
}
export async function searchByCategory(category: string, market: Market = DEFAULT_MARKET, signal?: AbortSignal): Promise<FoodProduct[]> {
 if (!/^en:[a-z0-9-]+$/.test(category)) return [];
 const items = searchResults(await getJson(buildCategoryUrl(category, market), 'search', signal), market);
 return items.filter(p => p.categories.includes(category));
}
