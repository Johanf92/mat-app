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

Det brukes relevante Open Food Facts-kategorier, deretter eventuelt ett fulltekstsøk når metadataene er ufullstendige. Landtilknytning kontrolleres også etter at API-et har svart; tilfeldige produkter fra andre markeder vises ikke som lokalvarer. Ukjente typer får manuell sammenligning i stedet for vilkårlige anbefalinger.

Resultater sorteres etter tilgjengelig datagrunnlag og gjenkjennelighet, **ikke** etter «sunnhet». Overordnede kategorier og produktnavn er feilutsatte. Det er bevisst mulig at ingen resultater vises.

## API

- Produkt: `/api/v2/product/{barcode}.json`
- Strukturert kategorisøk: `/api/v2/search?categories_tags=...&countries_tags_en=norway`
- Ved behov: eksisterende fulltekstsøk `/cgi/search.pl`
- Maksimalt to søkeforespørsler for et alternativsøk; minnecache og klientbasert begrensning
- Norsk standardmarked er en filtrering, ikke en garanti for at varen er tilgjengelig i butikk

API-dokumentasjon: https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/

## Gjenstående kvalitetsarbeid

- Undersøke om de konkrete kategorikodene dekker norske produkter riktig.
- Prøve levende søk på Oatly iKaffe og gresk naturell yoghurt på Android/iOS.
- Teste målegrunnlag og produktvarianter (100 g vs. 100 ml, original versus tilberedt).
- Gradvis utvide matchingen med kildebelagte regler; ikke konstruere en generisk «bedre mat»-score.
