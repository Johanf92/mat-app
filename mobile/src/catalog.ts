// Market is where a product is registered as sold, NOT its language or origin.
export type Market = { code: string; name: string; tag: string | null };
export const MARKETS: readonly Market[] = [
  { code: 'no', name: 'Norge', tag: 'en:norway' },
  { code: 'se', name: 'Sverige', tag: 'en:sweden' },
  { code: 'dk', name: 'Danmark', tag: 'en:denmark' },
  { code: 'fi', name: 'Finland', tag: 'en:finland' },
  { code: 'gb', name: 'Storbritannia', tag: 'en:united-kingdom' },
  { code: 'es', name: 'Spania', tag: 'en:spain' },
  { code: 'fr', name: 'Frankrike', tag: 'en:france' },
  { code: 'de', name: 'Tyskland', tag: 'en:germany' },
  { code: 'it', name: 'Italia', tag: 'en:italy' },
  { code: 'pt', name: 'Portugal', tag: 'en:portugal' },
  { code: 'gr', name: 'Hellas', tag: 'en:greece' },
  { code: 'nl', name: 'Nederland', tag: 'en:netherlands' },
  { code: 'us', name: 'USA', tag: 'en:united-states' },
  { code: 'th', name: 'Thailand', tag: 'en:thailand' },
  { code: 'sg', name: 'Singapore', tag: 'en:singapore' },
  { code: 'id', name: 'Indonesia', tag: 'en:indonesia' },
  { code: 'world', name: 'Alle land', tag: null },
];
export const DEFAULT_MARKET = MARKETS[0];
export function flag(code: string): string {
  return /^[a-z]{2}$/i.test(code)
    ? [...code.toUpperCase()].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
    : String.fromCodePoint(0x1f310);
}
export type NovaGroup = 1 | 2 | 3 | 4;
// Colour describes processing only. Labels must always accompany colours.
export const NOVA: Record<NovaGroup, { label: string; detail: string; background: string; foreground: string; accent: string }> = {
  1: { label: 'Minimalt bearbeidet', detail: 'Ubearbeidede eller minimalt bearbeidede matvarer.', background: '#E2F1E8', foreground: '#175337', accent: '#24764C' },
  2: { label: 'Matlagingsingredienser', detail: 'Bearbeidede ingredienser til matlaging, som olje, sukker og salt.', background: '#EEF5D9', foreground: '#405921', accent: '#93B74E' },
  3: { label: 'Bearbeidet', detail: 'Bearbeidede matvarer.', background: '#FFF0DD', foreground: '#854400', accent: '#DE8A21' },
  4: { label: 'Ultrabearbeidet', detail: 'Ultrabearbeidede matvarer.', background: '#FBE7E5', foreground: '#922F2C', accent: '#CB5953' },
};
export const UNKNOWN_NOVA = { label: 'Ikke klassifisert', detail: 'NOVA er ikke oppgitt i datakilden.', background: '#F0F2F1', foreground: '#52615A', accent: '#8E9A93' };
export function novaInfo(group: NovaGroup | null) { return group === null ? UNKNOWN_NOVA : NOVA[group]; }
export function amount(value: number | null, unit = 'g'): string {
  return value === null ? 'Ikke oppgitt' : value.toLocaleString('nb-NO', { maximumFractionDigits: 2 }) + ' ' + unit;
}
// Decode formatting entities only; never remove ingredients or guess translations.
export function readableText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const named: Record<string,string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (original, entity: string) => {
    if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? original;
    const code = entity.toLowerCase().startsWith('#x') ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code >= 32 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : original;
  }).trim();
}
export function numeric(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const n = typeof value === 'number' ? value : Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
