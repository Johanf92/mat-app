/**
 * Display aid only: preserve the exact original Open Food Facts allergen tags
 * in FoodProduct.allergens and the source section. A normalized label does not
 * establish that all allergens have been identified or that a product is safe.
 */
const NORWEGIAN_LABELS: Readonly<Record<string,string>> = {
  milk:'Melk',melk:'Melk',lettmelk:'Melk',helmelk:'Melk',
  'skimmed-milk':'Melk','semi-skimmed-milk':'Melk','whole-milk':'Melk',
  'cow-s-milk':'Melk','cow-milk':'Melk',lait:'Melk',mjolk:'Melk',
  egg:'Egg',eggs:'Egg',egg:'Egg',eggprodukter:'Egg',
  fish:'Fisk',fisk:'Fisk',crustaceans:'Skalldyr',skalldyr:'Skalldyr',
  molluscs:'Bløtdyr',blotdyr:'Bløtdyr',
  peanuts:'Peanøtter',peanut:'Peanøtter',peanotter:'Peanøtter',
  nuts:'Nøtter',notter:'Nøtter',
  soybeans:'Soya',soy:'Soya',soya:'Soya',sojabonner:'Soya',
  sesame:'Sesam', 'sesame-seeds':'Sesam',sesam:'Sesam',
  mustard:'Sennep',sennep:'Sennep',
  celery:'Selleri',selleri:'Selleri',
  lupin:'Lupin',lupine:'Lupin',
  gluten:'Gluten','gluten-containing-cereals':'Glutenholdig korn',
  wheat:'Hvete',hvete:'Hvete',rye:'Rug',rug:'Rug',
  barley:'Bygg',bygg:'Bygg',oats:'Havre',havre:'Havre',
  spelt:'Spelt',
  sulphites:'Sulfitter',sulfites:'Sulfitter',
  'sulphur-dioxide-and-sulphites':'Svoveldioksid og sulfitter'
};

function readableTag(raw:string):string {
  const key=raw.trim().toLowerCase()
    .replace(/^[a-z]{2,3}:/,'')
    .replace(/_/g,'-');
  if(!key)return raw.trim();
  // Avoid guessing that "lactose" means milk allergy, or that an unknown
  // arbitrary source tag denotes an allergen family.
  return NORWEGIAN_LABELS[key]??key.replace(/-/g,' ');
}

/** Deduplicate equivalent source labels and retain all unknown source terms. */
export function formatAllergenTags(tags:readonly string[]):string[] {
  const seen=new Set<string>();
  const labels:string[]=[];
  for(const raw of tags){
    if(typeof raw!=='string'||!raw.trim())continue;
    const label=readableTag(raw);
    const normalized=label.toLocaleLowerCase('nb-NO');
    if(seen.has(normalized))continue;
    seen.add(normalized);
    labels.push(label);
  }
  return labels;
}
