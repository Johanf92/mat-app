# Matkontroll

**Vit hva du spiser.**

Matkontroll (arbeidsnavn) er en Expo/React Native-app for å skanne matvarer, forstå ingredienser og bearbeidingsgrad, og sammenligne produkter uten kaloritelling eller moralske karakterer.

## Dette fungerer i prototypen

- Strekkodeskanning med mobilkamera og søk etter navn, merke eller strekkode
- Produkter og produktbilder fra Open Food Facts
- Landvelger (Norge som standard). Strekkoder slås opp globalt
- NOVA-grupper med forklaringer, makroer og tilgjengelig næringsinformasjon
- Et lite sett med kildebaserte norske E-stofforklaringer
- Forsiktig søk etter lignende produkter i samme bruksområde og valgte marked
- Sammenligning av to ekte produkter: NOVA, næringsverdier, ingredienser og tilsetningsstoffer
- Manuelt valg av produkt nummer to når datakilden mangler en passende kategori

## Kom i gang

Krever Node.js og Expo Go. Fra repository-roten:

```bash
cd mobile
npm install
npx expo start
```

Ved senere oppdateringer trenger du vanligvis bare `git pull` og `npx expo start --clear`. Installer på nytt bare når avhengighetene faktisk er endret.

## Kontroller

Fra `mobile`:

```bash
npm run typecheck
node --test tests/*.test.cjs
```

GitHub Actions kjører de samme kontrollene ved endringer.

## Søk og datakvalitet

Navnesøk og søk etter lignende matvarer bruker Search-a-licious (`search.openfoodfacts.org/search`).
Strekkodeskanning bruker fortsatt direkte produktoppslag (`world.openfoodfacts.org/api/v2/product`).
Det eldre `/cgi/search.pl` og det gamle kategorisøket er fjernet fra appens brukerflyt etter at de returnerte HTTP 503 i oktober 2026.

Søkedata kan være eldre enn den gjeldende produktdatabasen. Per oktober 2026 har Search-a-licious en rapportert utdatert produksjonsindeks, så produkter som finnes ved strekkode kan mangle i navnesøk. Søk er ikke komplett butikkregister.

## Data og begrensninger

Open Food Facts er fellesskapsdrevet og kan inneholde feil, manglende felter og flerspråklige ingredienslister. Manglende E-stoffer eller allergener betyr **ikke** at produktet er uten dem. NOVA måler bearbeiding og er ikke en samlet helsevurdering.

Landregistrering er ikke dokumentasjon på butikktilgjengelighet. Alternativmotoren støtter foreløpig bare noen få produktkategorier (havredrikker, havrebaserte kaffedrikker, gresk naturell yoghurt og naturell yoghurt). Den finner sammenlignbare varer, **ikke automatisk bedre** varer.

Se [sammenligningslogikken](docs/COMPARISON.md) og [utviklingsplanen](docs/ROADMAP.md). Backend og offline-lagring er planlagt senere.

Arbeidsnavnet Matkontroll er ikke varemerkeavklart. Produktdata og bilder: Open Food Facts (ODbL).
