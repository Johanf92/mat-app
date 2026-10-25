/**
 * Curated explanations of source words, not counts of additives, exposure
 * estimates, NOVA classifications or individual risk statements.
 */
export type IngredientTermInfo={
  id:string;
  name:string;
  category:string;
  description:string;
  source:string;
};
const CATEGORY_SOURCE='https://www.mattilsynet.no/mat-og-drikke/matproduksjon/tilsatte-stoffer-i-mat/ulike-typer-tilsetningsstoffer';
const AROMA_SOURCE='https://www.mattilsynet.no/mat-og-drikke/matproduksjon/tilsatte-stoffer-i-mat/aroma';

const catalogue: readonly { info: IngredientTermInfo; pattern: RegExp }[]=[
  { info:{
    id:'aroma',name:'Aroma',category:'Smak og lukt',
    description:'«Aroma» er en samlebetegnelse for stoffer eller blandinger som tilsettes for å gi eller endre lukt og smak. Det er ikke ett bestemt E-nummer. En aroma kan bestå av flere bestanddeler, og ingredienslisten navngir vanligvis ikke alle sammen. Ordet alene forteller ikke hvordan aromaen er fremstilt, hvor mye som er brukt eller noe sikkert om helserisikoen ved et bestemt produkt.',
    source:AROMA_SOURCE,
   }, pattern:/(^|[^a-zæøå])(?:naturlig(?:e)?\s+)?aroma(?:er|stoffer)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'emulgator',name:'Emulgator',category:'Funksjon i matvaren',
    description:'En emulgator bidrar til at ingredienser som normalt ikke lar seg blande, for eksempel olje og vann, kan danne eller beholde en jevn blanding. Ordet er en funksjonsgruppe, ikke navnet på ett bestemt stoff. Se ingredienslisten for eventuell konkret betegnelse eller E-kode.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])emulgator(?:er|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'fortykningsmiddel',name:'Fortykningsmiddel',category:'Funksjon i matvaren',
    description:'Fortykningsmidler kan gjøre en matvare mer tyktflytende eller påvirke konsistensen. Det finnes mange ulike stoffer med denne funksjonen. Betegnelsen alene forteller ikke hvilket stoff eller hvor mye produktet inneholder.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])fortykningsmid(?:del|ler)(?:et|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'stabilisator',name:'Stabilisator',category:'Funksjon i matvaren',
    description:'En stabilisator brukes for å bidra til at konsistens, blanding eller farge holder seg slik produsenten ønsker. Det er en funksjon, ikke ett bestemt E-nummer. Ingen bestemt helseeffekt kan utledes fra ordet alene.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])stabilisator(?:er|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'konserveringsmiddel',name:'Konserveringsmiddel',category:'Funksjon i matvaren',
    description:'Konserveringsmidler brukes for å forlenge holdbarheten, blant annet ved å begrense vekst av bakterier, gjær eller muggsopp. Hvilket stoff som er brukt og eventuelle bruksbegrensninger avhenger av produktet.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])konserveringsmid(?:del|ler)(?:et|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'surhetsregulerende',name:'Surhetsregulerende middel',category:'Funksjon i matvaren',
    description:'Surhetsregulerende midler brukes til å endre eller kontrollere hvor sur eller basisk en matvare er. Selve funksjonsnavnet forteller ikke hvilket stoff eller hvilken mengde som er brukt.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])surhets[\s-]*regulerende\s+mid(?:del|ler)(?:et|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'antioksidant',name:'Antioksidant',category:'Funksjon i matvaren',
    description:'Antioksidanter brukes i noen matvarer for å redusere uønskede oksidasjonsprosesser, for eksempel forandringer i farge eller smak. Ordet viser til en funksjon, ikke til ett bestemt stoff eller helseeffekt.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])antioksidant(?:er|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'fargestoff',name:'Fargestoff',category:'Funksjon i matvaren',
    description:'Fargestoffer brukes for å gi eller gjenopprette farge i matvarer. Betegnelsen omfatter mange ulike stoffer; ingredienslisten må undersøkes for å se hvilket stoff som er oppført.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])fargestoff(?:er|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'hevemiddel',name:'Hevemiddel',category:'Funksjon i matvaren',
    description:'Hevemidler bidrar til at deig eller røre hever seg ved å utvikle gass. Betegnelsen forteller ikke alene hvilken forbindelse eller mengde som er brukt.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])hevemid(?:del|ler)(?:et|ene)?(?=$|[^a-zæøå])/i
  },
  { info:{
    id:'sotstoff',name:'Søtstoff',category:'Funksjon i matvaren',
    description:'Søtstoffer brukes for å gi søtsmak og kan helt eller delvis erstatte sukker. Det finnes forskjellige søtstoffer med ulike egenskaper. Navnet «søtstoff» angir ikke hvilket stoff eller hvor mye som er brukt.',
    source:CATEGORY_SOURCE,
   }, pattern:/(^|[^a-zæøå])(?:søtstoff|sotstoff)(?:er|ene)?(?=$|[^a-zæøå])/i
  },
];
export function ingredientTerms(ingredients:string|undefined):IngredientTermInfo[]{
  if(!ingredients)return [];
  const text=ingredients.normalize('NFKC');
  return catalogue.filter(term=>term.pattern.test(text)).map(term=>term.info);
}
