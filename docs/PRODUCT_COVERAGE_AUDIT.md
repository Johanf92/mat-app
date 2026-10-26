# Produktdekning – måleplan

Mål: Mål reelle norske søkeresultater før vi vurderer en egen database. Ikke forveksle syntetiske enhetstester med målt dekning.

## Kontrollerte søk (30 representative kategoritreff)
Listen er en **testliste**, ikke en verifisert produktkatalog eller en fasit for strekkoder.

- Meieri: gresk yoghurt, naturell yoghurt, skyr naturell, kefir, lettmelk, helmelk
- Frokost/korn: havregryn, glutenfri havregryn, cornflakes, grovbrød, knekkebrød
- Pålegg: makrell i tomat, leverpostei, brunost, gulost, jordbærsyltetøy
- Sauser: Heinz ketchup, ketchup mindre sukker, majones, sennep
- Drikke: havredrikk, barista havredrikk, cola, cola zero, appelsinjuice
- Middag/ferdigmat: tomatsuppe, frossenpizza, pasta, hermetiske bønner, fiskekaker

## Hva vi måler
- Om søket returnerer treff, og om **første treff** faktisk gjelder matvaren
- Om produktet har gyldig strekkode, navn, bilde og varemerke
- Om ingrediensliste, næringstall, NOVA og Nutri-Score er registrert
- Om kilden oppgir motstridende verdier
- Om variantene kan skilles fra hverandre

## Metode
1. Kjør `cd mobile && node scripts/coverage-audit.cjs`. Krever nett, og kjører **kun manuelt**.
2. Les den rå rapporten. Treff betyr ikke nødvendigvis korrekt treff: første treff og dekningsgraden må kontrolleres manuelt.
3. Undersøk særlig feil for makrell i tomat og ketchup før vi utvider kategorireglene.
4. Først etter måling: velg mellom bedre OFF-integrasjon, supplerende lovlig datakilde og egen katalog.

Ingen automatiske kildeverdier kopieres inn i appen fra dette skriptet. Manglende data fylles aldri med gjennomsnittsverdier fra Matvaretabellen.
