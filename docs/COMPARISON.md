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


## Sprint: forskjeller og dokumentasjon

Sammenligningssiden viser først en kort «Hva er forskjellen?»-oppsummering etter produktkortene.
Den tar med tydelig ulike NOVA-registreringer og kontrollerbare forskjeller i
sukkerarter, protein og salt når begge verdier finnes. Ingredienstekst vurderes
bare på ordlyd (ikke ingrediensantall eller oppskriftslikhet). Ingen automatisk
kåring av «sunnest».

Open Food Facts kan markere enkelte ingredienser med understreker (for eksempel
«_lettmelk_»). Dette skjules kun i brukergrensesnittet; originalfeltet endres
ikke og navn eller ingredienser oversettes ikke.

Et eksplisitt E-nummer som står i ingredienslisten, sammenlignes med de
**separat registrerte** E-kodene. Manglende samsvar vises som et mulig
registreringshull, men kodene legges ikke automatisk til registreringslisten
og telles ikke som registrerte tilsetningsstoffer. Kjemiske stoffnavn gir ikke
grunnlag for å utlede en E-kode.

## Neste forbedring: dokumenterte E-kodeforskjeller

«Hva er forskjellen?» viser nå konkrete E-koder med en nøytral beskrivelse av
hvilket produkt de er oppført for. En egen detaljvisning oppgir om koden er
*nevnt i ingredienslisten*, *registrert i separat E-kodefelt* eller begge.
Dette er et skille mellom **datakilder**, ikke en automatisk konklusjon om
ingredienser som faktisk finnes eller mangler i maten.

Eksempel: To colaer kan ha samme sukkerinnhold og NOVA-gruppe, men E211 kan
være dokumentert bare for det ene produktet. E290 kan være registrert kun i
ett E-kodefelt selv om begge ingredienslistene nevner kullsyre. Matkontroll
trekker derfor ingen slutning om at det andre produktet mangler kullsyre.
E150d kan være nevnt i ingredienslisten uten å være registrert i det separate
E-kodefeltet. Ukjente og ufullstendige oppføringer skal synliggjøres, aldri
tolkes som bevis på fravær eller trygghet.

E211 har fått en begrenset, kildebasert forklaring på sin vanlige funksjon
som konserveringsmiddel. E-nummerlisten er fortsatt ikke fullstendig.

## Utvidet produktdekning – oktober 2026

Automatisk matching støtter nå også naturell kefir, skyr, cottage cheese, melketyper, havregryn, grovbrød, loff, rugknekkebrød, cornflakes, jordbærsyltetøy og eksplisitt merket tomatsuppe som pulver eller serveringsklar vare.

- Skyr og yoghurt sammenlignes ikke automatisk med hverandre.
- Sukkerholdig og sukkerfri cola holdes adskilt i *automatisk* søk, men kan sammenlignes manuelt.
- Produkter merket glutenfrie behandles som egne etikettvarianter i relevante kornkategorier; appen verifiserer aldri cøliaki- eller allergisikkerhet.
- Ukjente oppskrifter, blandingsprodukter og ubestemt tomatsuppe får manuelt valg fremfor løst funderte forslag.
- Samme produsents åpenbare like varianter med identiske næringsdata forsøkes slått sammen, men ulik oppskrift må ikke skjules av dette.

## Nutri-Score og NOVA

Nutri-Score er en bokstavbasert vurdering av næringsprofilen fra A til E, mens NOVA er en firedelt klassifisering av bearbeiding. Matkontroll viser dem separat: **NOVA har hovedplassen på produktsiden**; eventuell Nutri-Score er en mindre opplysning med forklaring. To produkter kan ha samme NOVA, men forskjellig Nutri-Score, eller omvendt.

Datakilden for bokstaven er Open Food Facts (prioritert felt `nutriscore_grade`, eventuelt eldre `nutrition_grades` hvis hovedfeltet mangler). Bare bokstavene A–E godtas. Ukjent/ikke relevant vises som «Ikke oppgitt», ikke en beregnet eller utledet verdi. Metoden er endret over tid; registrerte karakterer kan derfor bygge på ulike metodeversjoner. Det gjøres **ingen lokal helsepoengberegning** og ingen automatisk vinner.

Kilder: [Santé publique France](https://www.santepubliquefrance.fr/en/nutrition-and-physical-activity/nutri-score), [Open Food Facts' produktfelter](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/) og [Helsedirektoratets Nøkkelhullet](https://www.helsedirektoratet.no/forebygging-diagnose-og-behandling/forebygging-og-levevaner/kosthold-og-ernaering/merkeordningen-nokkelhullet).

## Produsent- og kildekvalitet

«Kort fortalt» på produktsiden viser bare registrerte fakta, ikke antatt eksponering eller personlig helserisiko. Ukjent næringsverdi er aldri null, E-kodeantall er ikke bevis på alle stoffer som er til stede, og produkter som er registrert for Norge kan likevel være utilgjengelige i norske butikker. Strenge matcheregler er med vilje viktigere enn høyt antall treff.


## Felles dokumentasjon av E-koder og ingrediensord

Produksiden og sammenligningen bruker nå samme funksjon `productAdditiveEvidence`. Den samler **bare eksplisitte E-numre** nevnt i ingredienslisten med databasens separate E-kodefelt. Hver kode viser om den kommer fra ingredienstekst, separat felt eller begge. Oppføringer som ikke kan gjenkjennes, beholdes i kildedataene, og E340-samlegrupper unngår dobbeltelling av egne underkoder.

Tallet i «Kort fortalt» er antall eksplisitte *oppføringer*, ikke en beregnet total mengde tilsetningsstoffer. Manglende dokumentasjon betyr aldri «uten tilsetningsstoffer».

En liten ordbasert sammenligning kan vise om eksempelvis «sukker», «søtstoff», «melk», «salt» eller «havre» er skrevet eksplisitt i bare én av ingredienslistene. Det er **ikke en fullstendig ingrediensparser**, og manglende ord i et felt er ikke bevis på at ingrediensen er fraværende. Hele ingredienslistene forblir tilgjengelige under detaljene.


## Produkttreff, kildeversjoner og dubletter

Automatiske forslag bruker søkeindeksen i Open Food Facts og kan derfor være eldre enn produktsiden. Hver sammenligning henter produktdata på nytt. Derfor krever vi eksplisitt markering av barista-/kaffevariant i produktnavnet, og en vare merket mandel-/soyadrikk i navnet kan ikke bli havredrikk bare fordi en kategori i søkeindeksen er feil.

For vanlig cola og sukkerfri cola brukes nå også registrerte næringsverdier når pakningsdubletter fra samme merke grupperes. Produktoppføringer fra samme merke som har ulik energi, sukkerarter eller karbohydratinnhold blir **ikke automatisk gjemt som samme oppskrift**. Dette er kildebasert presentasjonslogikk, ikke en påstand om at oppskriften faktisk er endret.

Forslag kan fortsatt være feil når selve produktregistreringen er feil. Det kan ikke løses helt uten verifiserte etiketter eller bedre kildeopplysninger.


E340-familier kan være visuelt samlet på produktsiden for å unngå å telle samlegruppen som et ekstra stoff. Den underliggende kildedokumentasjonen **beholder likevel både parent og underkode** i sammenligningen, slik at en visuelt skjult samlegruppe aldri feilaktig blir omtalt som fraværende.

## Søkefelter og visningskvalitet

Søket ber nå også om norske og engelske ingrediens-/produktnavnfelt, produktbilder, additive tags og allergen tags. Alle disse er **kildedata fra søkeindeksen**, som kan være mangelfulle eller eldre enn strekkodeoppslaget. Nye felter gjør at eksisterende normalisering og kvalitetsfiltre oftere kan bruke samme type kildeopplysninger i forslagene som på produktsiden. De betyr ikke at produktoppføringene er verifisert.

Ingrediensordsammenligningen støtter norske og engelske registreringer. Er et produkt registrert med et annet språk (for eksempel finsk), vises en forklaring i stedet for å påstå at norske ord «mangler». Hele originalteksten kan fortsatt leses. Ukjent språk i selve datakilden er også en begrensning.
