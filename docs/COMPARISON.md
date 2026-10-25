# Sammenligning og alternative produkter

## Brukerflyt

1. Brukeren skanner en strekkode eller søker opp et produkt.
2. «Lignende produkter» forsøker å finne samme *bruksområde* i valgt land.
3. Brukeren trykker «Sammenlign med denne» eller velger et annet produkt manuelt.
4. Sammenligningssiden viser to faktiske produkter og lar brukeren fremheve bearbeiding, ingredienser, protein eller sukker.
5. Manglende verdier vises eksplisitt som ukjent. NOVA er ikke en helsescore og brukes ikke til automatisk rangering.

## Matchingen i versjon 1

Følgende bruksområder har bevisst avgrensede regler:

- Havrebaserte drikker for kaffe/barista, inkludert «iKaffe», sammenlignes bare med andre havrebaserte kaffedrikker.
- Vanlige havredrikker blandes ikke med barista-varianter.
- Gresk naturell yoghurt blandes ikke med fruktyoghurt, vaniljeyoghurt eller vanlig yoghurt.
- Vanlig naturell yoghurt får egen kategori.
- Vanlig cola sammenlignes med vanlig cola, sukkerfri cola med sukkerfri cola. Energy, Dreamworld, kirsebær, kaffe og andre særvarianter utelates.
- «Gresk yoghurt» alene er ikke bevis for at yoghurten er naturell. Vi krever eksplisitt merking eller en kort og relevant melke-/kulturingrediensliste.

Vi søker nå etter relevante ord for bruksområdet i Search-a-licious, for eksempel «barista» eller «gresk yoghurt», og filtrerer deretter kandidater etter faktisk produkttype. Det er nødvendig fordi kategorisøkene for disse varene ga null treff i det nye søkeindekset under testing i oktober 2026. Landtilknytning kontrolleres også etter API-svaret; tilfeldige produkter fra andre markeder vises ikke som lokalvarer. Ukjente produkttyper får manuell sammenligning i stedet for vilkårlige anbefalinger.

Resultater sorteres etter typebevis og tilgjengelig datagrunnlag, **ikke** etter «sunnhet». Store karbohydratforskjeller merkes som noe brukeren bør undersøke, ikke som bevis på at en variant er sunnere.

Søkeresultater kan vise utdatert NOVA og næringsinnhold. I sammenligningen henter appen begge strekkodene fra produktdatabasen på nytt, og forklarer at avvik mellom gamle og nye verdier kan forekomme. Overordnede kategorier og produktnavn er feilutsatte. Det er bevisst mulig at ingen resultater vises.

## API

- Produktoppslag: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Fulltekstsøk og alternativer: `https://search.openfoodfacts.org/search?q=...` (Search-a-licious)
- Ett søk per alternativsøk, samt klientbasert forespørselsgrense og korttids-cache
- Valgt land sendes som `countries_tags:"en:norway"` i søket og kontrolleres på hver kandidat etterpå
- Norsk standardmarked betyr registrering for landet, ikke garantert butikklager
- Søkeresultatene kan være ufullstendige: Search-a-licious hadde i oktober 2026 en rapportert gammel produksjonsindeks, mens strekkodeoppslag leser nyere produktdata direkte

Referanser: https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/ og https://github.com/openfoodfacts/search-a-licious/issues/469

## Gjenstående kvalitetsarbeid

- Undersøke om de konkrete kategorikodene dekker norske produkter riktig.
- Prøve levende søk på Oatly iKaffe og gresk naturell yoghurt på Android/iOS.
- Teste målegrunnlag og produktvarianter (100 g vs. 100 ml, original versus tilberedt).
- Gradvis utvide matchingen med kildebelagte regler; ikke konstruere en generisk «bedre mat»-score.
