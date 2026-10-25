# Roadmap

## Levert i prototype
- [x] Expo/React Native, produktsøk, kameralese strekkoder
- [x] Open Food Facts direkte med kilde, korttids-cache og nøktern visning av manglende data
- [x] Landvelger og globalt strekkodeoppslag
- [x] NOVA 1–4 med farger og forklaring
- [x] Enkel E-stoffoppslagsbase med trykkbar forklaring, uten dobbeltelling av E340-familien
- [x] Forsiktig navnesøk etter samme bruksområde, med kontroll av produktnavn, land og tilgjengelige data
- [x] Byttet fra feilende legacy-søk (HTTP 503) til Search-a-licious (lesesøk)
- [x] Sammenligning av to faktiske produkter med vekt på bearbeiding, ingredienser, protein og sukker
- [x] Manuelt produktvalg når forslag ikke støttes
- [x] Strengere skille mellom naturell og uavklarte yoghurtvarianter
- [x] Egen matching for vanlig cola og sukkerfri cola, uten energidrikker og spesialsmaker
- [x] Synlige forbehold ved store karbohydratforskjeller og kildeverdier som ikke stemmer overens
- [x] Automatiske TypeScript- og logikktester i GitHub Actions
- [x] Støtte for skyr naturell, cottage cheese naturell, havregryn, lettmelk og helmelk med variantfilter
- [x] Separate søk for havregryn registrert som glutenfri og annen havre, uten å love allergen-/cøliakisikkerhet
- [x] Forklaringer av vanlige funksjonsord i ingredienslister, med Mattilsynet som kilde
- [x] Synlig oversikt over manglende næringsdata og interne motsetninger i kilden

## Prioriteres videre
- [ ] Test og forbedre reelle treff for iKaffe, gresk yoghurt og flere norske produktkategorier
- [ ] Bedre kategoritaksonomi og norsk markedskvalitet, uten falske tilgjengelighetsgarantier
- [ ] Mobiltest av skyr, cottage cheese, havregryn, melk og ingrediensord etter samlet utviklingsrunde
- [ ] Trygge, kildebelagte ingrediensforklaringer uten å omskrive kildens ingrediensliste
- [ ] Større, vedlikeholdbart og kildebelagt E-stoffregister
- [ ] Favoritter, historikk og mulighet til å rette feil i datakilden
- [ ] Django/DRF + PostgreSQL for caching, moderering og produktanalyse
- [ ] Mer robust feilhåndtering og brukertesting på iOS og Android
