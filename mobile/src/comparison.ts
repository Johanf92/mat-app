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


/**
 * Three scan-friendly facts with optional explanations.
 *
 * These are observations about the available records, never a health ranking.
 * Differences that are supported only by the separate E-code field are not
 * described as verified differences in the actual ingredient lists.
 */
export type QuickComparisonFact = {
  key: string;
  label: string;
  summary: string;
  detail: string;
};

/**
 * The overview prefers visible differences in *recorded values* over unchanged
 * classifications or tiny numeric variations. These display cutoffs are not
 * nutritional or medical significance thresholds.
 */
function overviewNutritionFacts(a: FoodProduct, b: FoodProduct, base: string): QuickComparisonFact[] {
  const specs: {key: MetricKey; label: string; unit: string; displayCutoff: number}[] = [
    {key:'sugar',label:'Sukkerarter',unit:'g',displayCutoff:2},
    {key:'energy',label:'Energi',unit:'kcal',displayCutoff:10},
    {key:'fat',label:'Fett',unit:'g',displayCutoff:0.8},
    {key:'protein',label:'Protein',unit:'g',displayCutoff:1},
  ];
  return specs.flatMap(({key,label,unit,displayCutoff})=>{
    const x=a[key],y=b[key];
    if(x===null||y===null||Math.abs(x-y)<displayCutoff)return [];
    const delta=Math.abs(x-y);
    const qualifier=key==='sugar'
      ? ' Sukkerarter kan også forekomme naturlig; tallet sier ikke alene hvor mye som er tilsatt.'
      : '';
    return [{
      key,label,
      summary:'A: '+amount(x,unit)+' · B: '+amount(y,unit)+' per oppgitt 100 g / 100 ml.',
      detail:'Forskjell i registrert '+label.toLowerCase()+': '+amount(delta,unit)+'.'
        +qualifier+' '+base,
    }];
  });
}

export function quickComparisonFacts(a: FoodProduct, b: FoodProduct): QuickComparisonFact[] {
  const facts: QuickComparisonFact[] = [];
  const base = 'Tallene gjelder per 100 g / 100 ml, slik kilden oppgir dem. Kontroller at varene har samme målegrunnlag.';
  const nutrition = overviewNutritionFacts(a,b,base);
  // Cap the numerical headlines at two. Leave room for other types of source
  // information, rather than implying a health ranking through more numbers.
  facts.push(...nutrition.slice(0,2));
  const sugarKnown = a.sugar !== null && b.sugar !== null;

  const evidence = additiveEvidenceRows(a, b);
  // Prioritize a code actually written in an ingredient list and documented
  // for only one side, before differences in source completeness.
  const oneSided = evidence.find(row =>
    row.code !== 'E290' &&
    ((row.aEvidence === 'not-recorded' && (row.bEvidence === 'ingredients' || row.bEvidence === 'both'))
      || (row.bEvidence === 'not-recorded' && (row.aEvidence === 'ingredients' || row.aEvidence === 'both')))
  );
  const otherDifference = evidence.find(row => row.differs && row.code !== 'E290');
  const highlighted = oneSided ?? otherDifference;
  const additiveFact: QuickComparisonFact | null = highlighted ? (() => {
    const onlyA = highlighted.aEvidence !== 'not-recorded' && highlighted.bEvidence === 'not-recorded';
    const onlyB = highlighted.bEvidence !== 'not-recorded' && highlighted.aEvidence === 'not-recorded';
    const summary = onlyA || onlyB
      ? 'Oppført for ' + (onlyA ? 'A' : 'B') + ', uten oppføring for ' + (onlyA ? 'B' : 'A') + ' i de undersøkte feltene.'
      : 'Oppført for begge, men registrert i ulike kildefelt.';
    return {
      key: 'additive-' + highlighted.code,
      label: highlighted.displayCode + ' · ' + highlighted.name,
      summary,
      detail: highlighted.role + '. Produkt A: ' + additiveEvidenceLabel(highlighted.aEvidence)
        + '. Produkt B: ' + additiveEvidenceLabel(highlighted.bEvidence)
        + '. Manglende oppføring dokumenterer ikke at stoffet er fraværende. Den registrerte mengden er ikke kjent.',
    };
  })() : null;

  // When no larger numeric difference is registered, comparing equal sugar
  // values can itself be useful (e.g. ordinary cola from different brands).
  if (facts.length === 0 && sugarKnown) {
    const delta=Math.abs(a.sugar!-b.sugar!);
    facts.push({
      key:'sugar',label:'Sukkerarter',
      summary:delta<0.005
        ? 'Samme registrerte mengde: '+amount(a.sugar!)+' per 100 g / 100 ml.'
        : 'A: '+amount(a.sugar!)+' · B: '+amount(b.sugar!)+' per 100 g / 100 ml.',
      detail:(delta<0.005
        ? 'Kilden oppgir samme mengde sukkerarter for begge produktene.'
        : 'Forskjell i registrerte sukkerarter: '+amount(delta)+'.')
        +' Sukkerarter kan også forekomme naturlig; tallet viser ikke alene hvor mye som er tilsatt. '+base,
    });
  }
  if(additiveFact&&facts.length<3)facts.push(additiveFact);
  // NOVA is a processing classification, not an indicator of health or safety.
  if(facts.length<3){
    if (a.nova !== null && b.nova !== null) {
      facts.push({
        key: 'nova',label:'Bearbeidingsgrad',
        summary:a.nova===b.nova
          ? 'Begge er registrert i NOVA '+a.nova+'.'
          : 'A: NOVA '+a.nova+' · B: NOVA '+b.nova+'.',
        detail:a.nova===b.nova
          ? 'Begge har samme registrerte NOVA-gruppe. Dette viser ikke at ingrediensene eller oppskriftene er identiske.'
          : 'Kilden oppgir ulik NOVA-gruppe. Vi kan ikke utlede årsaken av næringstallene alene. NOVA beskriver bearbeiding, ikke hva som er sunnest.',
      });
    }else if(a.nova!==b.nova){
      facts.push({
        key:'nova-unknown',label:'Bearbeidingsgrad',
        summary:'NOVA mangler for minst ett av produktene.',
        detail:'Vi anslår ikke bearbeidingsgrad ut fra navn eller næringsinnhold. Manglende NOVA er ikke en egen klasse.',
      });
    }
  }
  if(facts.length<3){
    const ai=a.ingredients?displayIngredientText(a.ingredients).trim():'';
    const bi=b.ingredients?displayIngredientText(b.ingredients).trim():'';
    if(ai&&bi){
      facts.push({
        key:'ingredients',label:'Ingredienslister',
        summary:ai.toLowerCase()===bi.toLowerCase()
          ?'Listene har lik registrert ordlyd.':'Listene har forskjellig registrert ordlyd.',
        detail:'Ordlyden beviser ikke i seg selv like eller ulike oppskrifter. Se hele kildeteksten under «Ingredienser» for å kontrollere det som faktisk er oppført.',
      });
    }else{
      facts.push({
        key:'missing-ingredients',label:'Ingrediensdata',
        summary:'Ingredienslisten mangler for minst ett produkt.',
        detail:'Vi kan ikke fastslå forskjeller i ingredienser når en liste er ufullstendig eller mangler.',
      });
    }
  }
  if(facts.length===0)facts.push({
    key:'limited-data',label:'Datagrunnlag',
    summary:'For lite sammenlignbar informasjon i de registrerte feltene.',
    detail:'Kontroller ingredienslisten og næringsdeklarasjonen på emballasjen. Manglende informasjon betyr ikke null.',
  });
  return facts.slice(0,3);
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
  if (focus === 'protein' && difference < 0.5) return 'Liten forskjell i registrert proteinmengde: A '+amount(x)+' og B '+amount(y)+' per 100 g / 100 ml (slik kilden oppgir). Tallene kan være avrundet; denne forskjellen alene sier lite om varene.';
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
