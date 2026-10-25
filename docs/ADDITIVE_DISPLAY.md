# Additive display correction

The header and cards use `summarizeAdditives` so that E340 + E340ii no longer produce a heading saying two while one grouped entry is visible.

- Letter suffixes such as E150d are retained. The old parser silently dropped them.
- Internal keys remain uppercase; visible codes use E150d and E340(ii).
- Only explicit family relationships are consolidated. Initially this covers E340(i), E340(ii), E340(iii). Sibling variants remain separate.
- Unrecognised raw tags remain visible, without invented explanations. Missing data never means additive-free.
- Original tags remain available under source/data quality. The count describes displayed records, not a verified count of substances in the product.
- The explanatory catalogue still contains only five entries; it is not a complete reference. Typical functions do not establish the actual function in a specific product.
- The broken generic Mattilsynet link was replaced by EFSA general information and the Food Standards Agency list of code/name mappings. These links are not product approvals or personalised safety evaluations.

References checked 2026-10-25:
- https://www.efsa.europa.eu/en/topics/topic/food-additives
- https://www.gov.uk/government/publications/approved-additives-and-e-numbers/approved-additives-and-e-numbers

Validation: 16 focused unit tests, strict TypeScript check of additives.ts and TSX syntax check of the changed screen. No physical-device or complete Expo build verification in this environment. Camera, SDK dependencies and alternative matching are unchanged.

From mobile, run: `node --test tests/additives.test.cjs`.
