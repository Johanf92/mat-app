// Small explanatory catalogue, not a safety ranking or a complete additive database.
export type AdditiveInfo = {
  id: string; name: string; role: string; description: string; source: string;
};
export const ADDITIVE_GENERAL_SOURCE = 'https://www.efsa.europa.eu/en/topics/topic/food-additives';
const NAMES_SOURCE = 'https://www.gov.uk/government/publications/approved-additives-and-e-numbers/approved-additives-and-e-numbers';
const NORWEGIAN_ADDITIVES_SOURCE = 'https://www.mattilsynet.no/mat-og-drikke/matproduksjon/tilsatte-stoffer-i-mat/bruk-av-tilsetningsstoffer';
const SWEETENERS_SOURCE = 'https://www.mattilsynet.no/mat-og-drikke/matproduksjon/tilsatte-stoffer-i-mat/sotstoffer';
const entries: Record<string, Omit<AdditiveInfo, 'id' | 'source'> & { source?: string }> = {
  E150D: { name: 'Ammoniumsulfittkaramell', role: 'Fargestoff', description: 'Gir produkter en brun farge.' },
  E290: { name: 'Karbondioksid', role: 'Gass', description: 'Brukes blant annet til å gi drikker kullsyre.' },
  E211: { name: 'Natriumbenzoat', role: 'Konserveringsmiddel', description: 'Brukes som konserveringsmiddel i enkelte matvarer og drikker.' },
  E338: { name: 'Fosforsyre', role: 'Surhetsregulerende middel', description: 'Kan brukes til å regulere surhetsgraden.' },
  E331: { name: 'Natriumsitrater', role: 'Surhetsregulerende middel', description: 'Salter av sitronsyre som blant annet brukes til å regulere surhetsgraden. E-nummeret sier ikke hvor mye som er brukt i produktet.', source: NORWEGIAN_ADDITIVES_SOURCE },
  E950: { name: 'Acesulfam K', role: 'Søtstoff', description: 'Et sterkt søtende søtstoff som kan brukes i drikker med lite eller uten tilsatt sukker. Mengden i denne varen er ikke oppgitt her.', source: SWEETENERS_SOURCE },
  E951: { name: 'Aspartam', role: 'Søtstoff', description: 'Et sterkt søtende søtstoff. Aspartam inneholder fenylalanin, som personer med fenylketonuri (PKU / Føllings sykdom) må ta hensyn til. Kontroller alltid den faktiske merkingen på emballasjen.', source: SWEETENERS_SOURCE },
  E340: { name: 'Kaliumfosfater', role: 'Surhetsregulerende middel', description: 'Samlebetegnelse for kaliumfosfater. Ulike varianter har egne undernumre.' },
  E340II: { name: 'Dikaliumfosfat', role: 'Surhetsregulerende middel', description: 'En variant i E340-familien. Kan brukes til å regulere surhetsgraden.' },
};
// Explicit relationships only. A shared numeric prefix is not enough to merge records.
const FAMILIES: Readonly<Record<string, readonly string[]>> = {
  E340: ['E340I', 'E340II', 'E340III'],
};
const ROMAN = /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)$/;
type CodeParts = { number: string; letter: string; variant: string };
function parseCode(value: string): CodeParts | null {
  const text = value.trim().replace(/^[a-z]{2,3}:/i, '').replace(/\s/g, '').toUpperCase();
  const match = /^E(\d{3,4})(.*)$/.exec(text);
  if (!match) return null;
  const suffix = match[2];
  if (!suffix) return { number: match[1], letter: '', variant: '' };
  if (ROMAN.test(suffix)) return { number: match[1], letter: '', variant: suffix };
  const wrapped = /^\(([IVX]+)\)$/.exec(suffix);
  if (wrapped && ROMAN.test(wrapped[1])) return { number: match[1], letter: '', variant: wrapped[1] };
  const withLetter = /^([A-Z])(?:([IVX]+)|\(([IVX]+)\))?$/.exec(suffix);
  if (!withLetter) return null;
  const variant = withLetter[2] || withLetter[3] || '';
  if (variant && !ROMAN.test(variant)) return null;
  return { number: match[1], letter: withLetter[1], variant };
}
// Recognising the spelling does not assert that a code is authorised or safe.
export function normalizeAdditive(value: string): string | null {
  const parts = parseCode(value);
  return parts ? 'E' + parts.number + parts.letter + parts.variant : null;
}
export function formatAdditiveCode(value: string): string {
  const parts = parseCode(value);
  if (!parts) return value;
  return 'E' + parts.number + parts.letter.toLowerCase() + (parts.variant ? '(' + parts.variant.toLowerCase() + ')' : '');
}
export function additiveInfo(raw: string): AdditiveInfo | null {
  const id = normalizeAdditive(raw);
  if (!id) return null;
  const entry = entries[id];
  return entry ? { id, ...entry, source: entry.source ?? NAMES_SOURCE } : {
    id, name: 'Forklaring mangler', role: 'Funksjon ikke avklart',
    description: 'Koden er registrert i datakilden, men vi har ikke en forklaring for dette nummeret ennå. Vi gjetter ikke på funksjonen.',
    source: ADDITIVE_GENERAL_SOURCE,
  };
}
export type AdditiveSummary = {
  items: AdditiveInfo[]; unrecognized: string[]; rawTags: string[];
  groupedParents: string[]; title: string; groupingNote: string | null;
};
export function summarizeAdditives(values: readonly string[]): AdditiveSummary {
  const rawTags = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  const recognized = new Map<string, AdditiveInfo>();
  const unrecognized: string[] = [];
  for (const raw of rawTags) {
    const item = additiveInfo(raw);
    if (item) recognized.set(item.id, item);
    else unrecognized.push(raw); // Keep unfamiliar formats visible, never silently discard them.
  }
  const groupedParents = Object.keys(FAMILIES).filter(parent =>
    recognized.has(parent) && FAMILIES[parent].some(child => recognized.has(child)));
  const items = [...recognized.values()].filter(item => !groupedParents.includes(item.id));
  const count = items.length + unrecognized.length;
  const groupingNote = groupedParents.length ? groupedParents.map(parent => {
    const variants = FAMILIES[parent].filter(child => recognized.has(child)).map(formatAdditiveCode).join(', ');
    return formatAdditiveCode(parent) + ' er en samlegruppe og vises her gjennom ' + variants + ', ikke som et ekstra stoff.';
  }).join(' ') : null;
  return {
    items, unrecognized, rawTags, groupedParents, groupingNote,
    title: 'Tilsetningsstoffer' + (count ? ' · ' + count + (count === 1 ? ' oppføring' : ' oppføringer') : ''),
  };
}
// Retain the public helper for callers; use summarizeAdditives in UI to retain unknown raw tags.
export function groupAdditives(values: readonly string[]): AdditiveInfo[] {
  return summarizeAdditives(values).items;
}
