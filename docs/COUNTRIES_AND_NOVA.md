# Landvalg og NOVA - prototypeoppdatering

## Implementert

- Norge som standard; flagg og landnavn, 16 land og et eksplisitt Alle land-valg.
- Land betyr registrert salgsmarked. Det er ikke produksjonsland, tekstsprak eller butikkens lagerstatus.
- Land beholdes mellom skjermene i samme appokte via MarketProvider. Ved full omstart er standarden Norge igjen.
- Manuelt sok med knapp/Enter, aldri API-kall for hvert tastetrykk.
- Globalt strekkodeoppslag ved 8-14 siffer i sokefeltet, uavhengig av valgt land.
- NOVA 1 gronn, 2 lys gronn, 3 oransje, 4 rod; ukjent gra. Alltid nummer + tekst.
- Trykkbar NOVA-forklaring med alle fire grupper. Fargene er appens egne, ikke en offisiell helseskala.
- SafeAreaView fra react-native-safe-area-context og fast tilbakeknapp utenfor ScrollView.
- Makroer protein/fett/karbohydrat og utvidbar naeringsoversikt. Null og manglende verdier holdes adskilt.
- Ingredienslisten forkortes bare visuelt; hele kildeteksten beholdes. Vanlige HTML-entiteter dekodes, men vi oversetter eller gjetter ikke.
- Fem minutters minnecache, timeout og lokal foresporselsbegrensning. Cache er ikke offline-lagring.
- Ingen nye pakker eller versjonsendringer i denne oppdateringen.

## Fortsatt ikke implementert

Kameraskanning, permanente brukerinnstillinger, kvalitetssikrede forklaringer per E-stoff, automatiske produktalternativer og Django-backend er egne milepaeler. Den gamle compare-ruten bruker fortsatt demoopplysninger og er ikke lenket fra ekte produkter.

## Regler for kommende alternativer

1. Samme type og bruk: gresk naturell yoghurt mot gresk naturell yoghurt.
2. Valgt land; manglende markedstagg er ukjent, ikke bevis pa tilgjengelighet.
3. Smak/sotning skal vaere kjent for begge varer; sukkerverdien alene kan ikke avgjore dette.
4. Samme naeringsgrunnlag (100 g eller 100 ml), med mangler synlig.
5. Ingen skjult overgang til andre land, ingen antakelse om at faerre registrerte E-stoffer betyr faerre faktiske stoffer.
6. Vis konkret forskjell, ikke en universell vinner. Returner ingen alternativer nar grunnlaget er for svakt.

## Teknisk

`catalog.ts`: land, NOVA-presentasjon og rene normaliseringshjelpere.
`MarketContext.tsx`: appens delte landvalg, uten diskpersistens.
`openFoodFacts.ts`: avgrenset API-klient, markedssok og globalt barcode-oppslag.
`ui.tsx`: gjenbrukbar landvelger, skrollbar dialog, kildelenke og NOVA-merke.

Vi beholder eksisterende `/cgi/search.pl` for fritekst og `/api/v2/product` i denne prototypen. OFF anbefaler v3 for nye integrasjoner, men fritekst finnes ikke i v2/v3-sokeendepunktet. Flytting til ny backend og aktuell soketjeneste planlegges separat, ikke ved a blande API-skjemaer i UI-et.

## Kilder og databruk

- API og bruksgrenser: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Sok, fritekst og felt: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-cheatsheet/
- Land-/kategori-felt: https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/
- Trygge skjermkanter: https://docs.expo.dev/develop/user-interface/safe-areas/
- NOVA: https://world.openfoodfacts.org/nova
- Data/kilder: https://world.openfoodfacts.org/terms-of-use

Krediter Open Food Facts. Databasen er ODbL, individuelle opplysninger DbCL, bilder CC BY-SA. Ingen produktbilder eller produktdatabase er kopiert inn i repoet i denne endringen. Lisenskrav ved senere databasegjenbruk ma vurderes for den konkrete losningen.

## Verifisering

Kjor fra mobile:

```
node tests/catalog.test.cjs
npm run typecheck
```

Testfilen bruker eksisterende TypeScript-avhengighet og mocker nettverkskall; den beviser ikke at API-et er tilgjengelig pa telefonen. Test fysisk: sok i Norge, bytt til Sverige, apne en vare og ga tilbake, velg Alle land, skriv en strekkode, apne NOVA-dialog, og test med stor skrift. Kamerafeltet skal tydelig vaere uaktivt.
