# Matkontroll – samlet mobiltest etter utviklingsrunden

Test med Expo Go etter `git pull` og `npx expo start --clear` fra `mobile`. Du trenger ikke hente varene fra kjøleskapet: Søkefeltet tar imot strekkoder, og søkeord kan brukes for nye kategorier.

## 1. Kjente strekkoder

Prøv disse én og én ved å skrive hele koden i appens søkefelt:

- `5449000000996` – Coca-Cola Original (tidligere brukt i våre tester)
- `7394376616037` – Oatly iKaffe
- `7038010069451` – TINE gresk yoghurt

For hver vare: Kontroller at produktnavn, bilde/fallback, NOVA, Nutri-Score og «Kort fortalt» vises uten krasj. Mangler Nutri-Score, skal det stå «Ikke oppgitt», ikke en beregnet verdi. Trykk på forklaringene for NOVA og Nutri-Score; de skal beskrive forskjellige formål.

## 2. Alternativsøk og sammenligning

- På Oatly: «Finn alternativer», kontroller at eventuelle treff er havredrikker for kaffe/barista, ikke mandeldrikk eller kaffesirup.
- På gresk naturell yoghurt: forslag skal være samme type yoghurt, ikke fruktyoghurt eller skyr.
- På Coca-Cola: sammenlign gjerne mot en annen vanlig cola. Hvis du vil teste Zero mot Original, velg produkt B manuelt; forskjeller i sukker, søtstoffer og NOVA må ikke bli en helsedom.

## 3. Nye varetyper (bruk tekstsøk)

Søk på `grovbrød`, `corn flakes`, `jordbærsyltetøy` og `tomatsuppe`. Velg et faktisk produkt dersom det finnes i resultatene. Bekreft at matvaretypene får relevante alternativer, eller en ærlig melding om ingen treff. Tomatsuppepulver skal ikke automatisk blandes med serveringsklar suppe.

## 4. Manglende data og kilde

Åpne «Kilde og datakvalitet» og sjekk at manglende verdier ikke vises som null. Ukjente allergenopplysninger må aldri bli påstand om «allergenfritt». Ved manglende eller feil bilde skal appen vise en reservevisning, ikke en blank rute.

## Ved feil

Noter produktnavn/strekkode, hvilken knapp som ble brukt og hva som skjedde. Ett skjermbilde er nok per ulik feiltype; det er ikke nødvendig å fotografere hele forløpet. Søkedata kan være ufullstendige eller eldre enn strekkodeoppslag hos Open Food Facts.

**Godkjenningskriterium:** Ingen appkrasj, ingen meningsløse automatiske forslag, ingen udokumenterte helse- eller allergenpåstander. Antall treff er mindre viktig enn at treffene er relevante.


## Oppfølging etter skjermbildene 25. oktober

- **TINE yoghurt gresk type:** Åpne «Tilsetningsstoffer» og se at tomt E-kodefelt forklares som manglende registrering, ikke som bekreftet fri for E-stoffer. Åpne «Allergenopplysninger»: `en:milk` og `no:lettmelk` skal vises som «Melk», mens råkodene finnes under kilder.
- **Oatly iKaffe vs Coop Kaurajuoma:** Et produkt uten barista-/kaffemerking i navnet skal ikke automatisk anbefales som baristaalternativ selv om en gammel søkeindeks har en slik kategorikode. Manuell sammenligning er fortsatt mulig og skal beskrive dem som havredrikkvarianter, ikke som urelaterte produktgrupper.
- **Brød og havredrikk:** Sjekk om E170 og E472e nå har faktiske stoffnavn, funksjon og kilde. Fravær av en oppføring i feltet er fremdeles ikke bevis for fravær i varen.
