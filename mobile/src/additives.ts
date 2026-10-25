// Curated, neutral Norwegian explanations. Not medical safety ratings.
export type AdditiveInfo={id:string;name:string;role:string;description:string;source:string};
const SOURCE='https://www.mattilsynet.no/mat-og-drikke/tilsetningsstoffer';
const entries:Record<string,Omit<AdditiveInfo,'id'|'source'>>={
 'E150D':{name:'Ammoniumsulfittkaramell',role:'Fargestoff',description:'Gir produkter en brun farge.'},
 'E290':{name:'Karbondioksid',role:'Gass',description:'Brukes blant annet til å gi drikker kullsyre.'},
 'E338':{name:'Fosforsyre',role:'Surhetsregulerende middel',description:'Brukes til å regulere surhetsgrad og bidra til syrlig smak.'},
 'E340':{name:'Kaliumfosfater',role:'Surhetsregulerende middel',description:'Samlebetegnelse for kaliumfosfater. Ulike varianter har egne undernumre.'},
 'E340II':{name:'Dikaliumfosfat',role:'Surhetsregulerende middel',description:'En bestemt variant i E340-familien. Kan brukes til å regulere surhetsgraden.'}
};
export function normalizeAdditive(value:string):string|null {
 const match=value.toUpperCase().replace(/^[A-Z]{2}:/,'').replace(/[^A-Z0-9]/g,'').match(/^E(\d{3,4})([IVX]{1,4})?$/);
 return match?'E'+match[1]+(match[2]||''):null;
}
export function additiveInfo(raw:string):AdditiveInfo|null {
 const id=normalizeAdditive(raw);if(!id)return null;
 const entry=entries[id];
 return entry?{id,...entry,source:SOURCE}:{id,name:'Forklaring ikke tilgjengelig',role:'Ukjent funksjon',description:'Vi har ikke en kontrollert forklaring for dette nummeret ennå. Et E-nummer betyr ikke i seg selv at stoffet er skadelig.',source:SOURCE};
}
export function groupAdditives(values:string[]):AdditiveInfo[]{
 const items=values.map(additiveInfo).filter((x):x is AdditiveInfo=>x!==null);
 const unique=[...new Map(items.map(x=>[x.id,x])).values()];
 // If an exact subtype is present, avoid also counting its family heading as a separate additive.
 return unique.filter(x=>!unique.some(other=>other.id!==x.id&&other.id.startsWith(x.id)&&/^E\d+$/.test(x.id)));
}
