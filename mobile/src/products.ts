export type Product = { id:string; name:string; brand:string; nova:number|null; ingredients:string; protein:number; sugar:number; fiber:number; salt:number; positives:string[]; notes:string[] };
// DEMO ONLY: These are fictional examples, not verified product information.
export const products:Product[] = [
{id:'yoghurt',name:'Jordbæryoghurt',brand:'Eksempelmerke',nova:4,ingredients:'Melk, jordbær, sukker, fortykningsmiddel (fiktivt eksempel)',protein:5.2,sugar:11.4,fiber:0.3,salt:0.12,positives:['Inneholder protein'],notes:['Tilsatt sukker','NOVA 4 betyr ultrabearbeidet, ikke automatisk usunt']},
{id:'naturell',name:'Naturell yoghurt',brand:'Eksempelmerke',nova:1,ingredients:'Melk, yoghurtkultur (fiktivt eksempel)',protein:4.1,sugar:4.8,fiber:0,salt:0.1,positives:['Ingen tilsatt sukker i dette eksemplet'],notes:['Inneholder naturlig melkesukker']}
];
