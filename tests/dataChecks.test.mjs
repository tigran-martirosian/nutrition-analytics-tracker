// Checks the USDA amino acid id mapping on a beef shank payload (FDC ID 169443, abridged).
// Run with: node tests/dataChecks.test.mjs

import assert from "node:assert/strict";
import {
  mapFDCFood,
  validateAminoAcids,
} from "../src/services/usdaClient.js";
import {
  resolveAminoPath,
  USDA_AMINO_ID_MAP,
  USDA_AMINO_NAME_MAP,
  normalizeNutrientName,
} from "../src/data/usdaNutrientMap.js";
import { normaliseUSDANutrition } from "../src/services/usdaService.js";
import { INITIAL_FOODS } from "../src/data/foods.js";
import { foodsToCSV, parseFoodsCSV, mergeFoodRecords, CsvImportError } from "../src/utils/csv.js";
import { migrateVitaminDUnits } from "../src/utils/nutrition.js";

// Beef shank crosscuts (raw), abridged USDA payload with the amino rows, protein and a trace mineral. Amounts are g/100g.
const BEEF_SHANK_USDA = {
  fdcId: 169443,
  description: "Beef, shank crosscuts, separable lean only, raw",
  foodNutrients: [
    { nutrient: { id: 1003, name: "Protein"       }, amount: 21.86 },
    { nutrient: { id: 1210, name: "Tryptophan"    }, amount: 0.244 },
    { nutrient: { id: 1211, name: "Threonine"     }, amount: 0.930 },
    { nutrient: { id: 1212, name: "Isoleucine"    }, amount: 0.978 },
    { nutrient: { id: 1213, name: "Leucine"       }, amount: 1.719 },
    { nutrient: { id: 1214, name: "Lysine"        }, amount: 1.810 },
    { nutrient: { id: 1215, name: "Methionine"    }, amount: 0.557 },
    { nutrient: { id: 1216, name: "Cystine"       }, amount: 0.227 },
    { nutrient: { id: 1217, name: "Phenylalanine" }, amount: 0.849 },
    { nutrient: { id: 1219, name: "Valine"        }, amount: 1.058 },
    { nutrient: { id: 1220, name: "Arginine"      }, amount: 1.375 },
    { nutrient: { id: 1221, name: "Histidine"     }, amount: 0.745 },
    { nutrient: { id: 1225, name: "Glycine"       }, amount: 1.187 },
    { nutrient: { id: 1226, name: "Proline"       }, amount: 0.950 },
  ],
};

// 1. Canonical map sanity
function testCanonicalIds() {
  // Spot-check the IDs that are easiest to confuse.
  assert.equal(USDA_AMINO_ID_MAP[1212], "amino_acids.isoleucine",   "ID 1212 → isoleucine");
  assert.equal(USDA_AMINO_ID_MAP[1213], "amino_acids.leucine",      "ID 1213 → leucine");
  assert.equal(USDA_AMINO_ID_MAP[1214], "amino_acids.lysine",       "ID 1214 → lysine");
  assert.equal(USDA_AMINO_ID_MAP[1215], "amino_acids.methionine",   "ID 1215 → methionine");
  assert.equal(USDA_AMINO_ID_MAP[1216], "amino_acids.cysteine",     "ID 1216 → cysteine (USDA 'Cystine')");
  assert.equal(USDA_AMINO_ID_MAP[1217], "amino_acids.phenylalanine","ID 1217 → phenylalanine");
  assert.equal(USDA_AMINO_ID_MAP[1221], "amino_acids.histidine",    "ID 1221 → histidine");
  assert.equal(USDA_AMINO_ID_MAP[1225], "amino_acids.glycine",      "ID 1225 → glycine");
  assert.equal(USDA_AMINO_ID_MAP[1226], "amino_acids.proline",      "ID 1226 → proline");
  console.log("✓ canonical USDA_AMINO_ID_MAP IDs match the USDA spec");
}

// 2. Name-fallback normalization
function testNameFallback() {
  assert.equal(normalizeNutrientName("Cystine"),       "cystine");
  assert.equal(normalizeNutrientName("Aspartic acid"), "asparticacid");
  assert.equal(normalizeNutrientName("  Glycine  "),   "glycine");
  assert.equal(USDA_AMINO_NAME_MAP.cystine,  "amino_acids.cysteine");
  assert.equal(USDA_AMINO_NAME_MAP.cysteine, "amino_acids.cysteine");
  console.log("✓ name fallback normalizes case, whitespace, and cystine→cysteine");
}

// 3. resolveAminoPath end-to-end (ID first, then name)
function testResolve() {
  // ID present -> use it
  assert.equal(resolveAminoPath(1213, "Leucine"),    "amino_acids.leucine");
  // ID present but unknown -> fall back to name
  assert.equal(resolveAminoPath(99999, "Histidine"), "amino_acids.histidine");
  // ID missing -> fall back to name
  assert.equal(resolveAminoPath(null,  "Methionine"),"amino_acids.methionine");
  // Both missing -> null (skip)
  assert.equal(resolveAminoPath(null,  "Vitamin Q"), null);
  console.log("✓ resolveAminoPath uses ID first, then normalized name fallback");
}

// 4. Beef shank end-to-end import
function testBeefShank() {
  const out = mapFDCFood(BEEF_SHANK_USDA);
  const aa  = out.amino_acids;

  // Every amino acid must land on its own field.
  assert.equal(aa.leucine,       1.719, "leucine should be 1.719");
  assert.equal(aa.isoleucine,    0.978, "isoleucine should be 0.978");
  assert.equal(aa.lysine,        1.810, "lysine should be 1.810");
  assert.equal(aa.methionine,    0.557, "methionine should be 0.557");
  assert.equal(aa.phenylalanine, 0.849, "phenylalanine should be 0.849");
  assert.equal(aa.histidine,     0.745, "histidine should be 0.745");
  assert.equal(aa.glycine,       1.187, "glycine should be 1.187");
  assert.equal(aa.proline,       0.950, "proline should be 0.950");

  // The remaining amino acids in the fixture
  assert.equal(aa.tryptophan, 0.244);
  assert.equal(aa.threonine,  0.930);
  assert.equal(aa.cysteine,   0.227);
  assert.equal(aa.valine,     1.058);
  assert.equal(aa.arginine,   1.375);
  console.log("✓ beef shank crosscuts: every amino acid lands on the correct field");
}

// 5. Missing ids are not zero-filled (manual values must survive)
function testMissingNotZeroFilled() {
  // USDA payload that omits cysteine entirely
  const partial = {
    foodNutrients: [
      { nutrient: { id: 1213, name: "Leucine" }, amount: 1.719 },
    ],
  };
  const out = mapFDCFood(partial);
  // amino_acids should only hold leucine. cysteine must be undefined, not 0, so a re-sync keeps manual values.
  assert.equal(out.amino_acids.leucine,   1.719);
  assert.equal(out.amino_acids.cysteine,  undefined, "cysteine must be undefined when USDA omits it");
  assert.equal(out.amino_acids.histidine, undefined, "histidine must be undefined when USDA omits it");
  console.log("✓ missing USDA amino acids stay undefined (not 0)");
}

// 6. Explicit zero IS preserved
function testExplicitZero() {
  const explicit = {
    foodNutrients: [
      { nutrient: { id: 1213, name: "Leucine" }, amount: 1.719 },
      { nutrient: { id: 1221, name: "Histidine" }, amount: 0 },
    ],
  };
  const out = mapFDCFood(explicit);
  assert.equal(out.amino_acids.histidine, 0, "explicit 0 must round-trip as 0");
  console.log("✓ explicit USDA zero is preserved (distinct from missing)");
}

// 7. Name-only payload (some search responses lack nutrient.id)
function testNameOnlyPayload() {
  const nameOnly = {
    foodNutrients: [
      { nutrient: { name: "Leucine"  }, amount: 1.719 },
      { nutrient: { name: "Cystine"  }, amount: 0.227 }, // USDA spelling
      { nutrientName: "Histidine",      amount: 0.745 }, // search-API shape
    ],
  };
  const out = mapFDCFood(nameOnly);
  assert.equal(out.amino_acids.leucine,   1.719);
  assert.equal(out.amino_acids.cysteine,  0.227);
  assert.equal(out.amino_acids.histidine, 0.745);
  console.log("✓ name-fallback works for nutrient.name and flat nutrientName shapes");
}

// 8. normaliseUSDANutrition preserves undefined for missing amino acids
function testNormaliseDoesNotZeroFill() {
  const mapped = mapFDCFood(BEEF_SHANK_USDA);
  const norm   = normaliseUSDANutrition(mapped);
  // Cysteine was reported (1216) -> present
  assert.equal(norm.amino_acids.cysteine, 0.227);
  // Taurine was NOT reported -> must NOT appear (downstream merge can't clobber)
  assert.equal(norm.amino_acids.taurine, undefined,
    "normaliseUSDANutrition must not zero-fill missing amino acids");
  console.log("✓ normaliseUSDANutrition preserves undefined for missing fields");
}

// 9. Validator does not warn on a clean import
function testValidatorClean() {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    const out = mapFDCFood(BEEF_SHANK_USDA);
    validateAminoAcids(out.amino_acids, BEEF_SHANK_USDA);
  } finally {
    console.warn = orig;
  }
  assert.equal(warnings.length, 0, `validator must not warn on a clean import (got ${warnings.length})`);
  console.log("✓ validator stays quiet on a correctly-mapped beef shank import");
}

// 10. Validator warns on a scrambled pattern
function testValidatorCatchesSwap() {
  const warnings = [];
  const orig = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    // Synthesize the symptom: leucine < isoleucine, lysine < methionine, hist=0
    validateAminoAcids({
      leucine:    0.978,
      isoleucine: 1.719,
      lysine:     1.810,
      methionine: 1.810,
      histidine:  0,
      glycine:    1,
      proline:    0.95,
      arginine:   1.4,
      valine:     1.0,
    }, { description: "synthetic swap" });
  } finally {
    console.warn = orig;
  }
  assert.ok(warnings.length >= 2, `validator must warn on the swap pattern (got ${warnings.length})`);
  console.log("✓ validator catches a leucine/isoleucine swap pattern");
}

// Run all
function testVitaminDIuConversion() {
  const out = mapFDCFood({
    description: "synthetic tuna vitamin D payload",
    foodNutrients: [
      { nutrient: { id: 1110, name: "Vitamin D (D2 + D3), International Units" }, amount: 400 },
    ],
  });
  assert.equal(out.vitamins.d, 10, "USDA nutrient 1110 must be converted from IU to micrograms");
  console.log("✓ USDA vitamin D IU values are converted to micrograms");
}

function testLegacyVitaminDMigration() {
  const [food] = migrateVitaminDUnits([{
    name: "Tuna",
    source: { provider: "usda" },
    nutrition_per_100g: { vitamins: { d: 400 } },
  }]);
  assert.equal(food.nutrition_per_100g.vitamins.d, 10, "legacy USDA vitamin D IU cache should migrate to micrograms");
  console.log("✓ legacy USDA vitamin D cache values are migrated to micrograms");
}

// CSV import / export
function testCsvRoundTrip() {
  const records = parseFoodsCSV(foodsToCSV(INITIAL_FOODS));
  assert.equal(records.length, INITIAL_FOODS.length);
  const { foods, added, updated } = mergeFoodRecords(INITIAL_FOODS, records);
  assert.deepEqual(foods, INITIAL_FOODS, "export then import must leave the foods unchanged");
  assert.equal(added, 0);
  assert.equal(updated, INITIAL_FOODS.length);
  console.log("✓ CSV export then import round-trips the sample foods unchanged");
}

function testCsvQuotedFields() {
  const csv = 'Name,Category,Weekly Amount,Unit,Price/Unit,Weekly Cost,Cal/100g,Prot,Fat,Carbs\r\n'
    + '"Bread, whole ""wheat""",other,2,count,3.5,7.00,250,10,3,45\r\n';
  const [rec] = parseFoodsCSV(csv);
  assert.equal(rec.name, 'Bread, whole "wheat"');
  assert.equal(rec.nutrition.calories, 250);
  const [header, row] = foodsToCSV([{ ...INITIAL_FOODS[0], name: 'Bread, whole "wheat"' }]).split("\n");
  assert.ok(header.startsWith("Name,"));
  assert.ok(row.startsWith('"Bread, whole ""wheat""",'), "serialiser must quote commas and double the quotes");
  console.log("✓ CSV quoted fields keep commas and quotes in both directions");
}

function testCsvEmptyCellIsMissing() {
  const csv = "Name,Category,Weekly Amount,Unit,Price/Unit,Weekly Cost,Cal/100g,Prot,Fat,Carbs\n"
    + "Oats,,,,,,,,,\n";
  const [rec] = parseFoodsCSV(csv);
  assert.equal(rec.nutrition.calories, null, "empty cell must parse as null, not 0");
  assert.equal(rec.weekly_amount, null);
  const oats = INITIAL_FOODS.find((f) => f.id === "oats");
  const { foods } = mergeFoodRecords(INITIAL_FOODS, [rec]);
  assert.deepEqual(foods.find((f) => f.id === "oats"), oats, "missing cells must not change an existing food");
  console.log("✓ CSV empty cells stay missing and do not overwrite stored values");
}

function testCsvKeepsManualOverrides() {
  const base = [{ ...INITIAL_FOODS[0], manual_overrides: { calories: 111 }, nutrition_per_100g: { ...INITIAL_FOODS[0].nutrition_per_100g, calories: 111 } }];
  const rec = { name: base[0].name, category: null, unit: null, weekly_amount: null, price_per_unit: null,
    nutrition: { calories: 999, protein: 5, fat: null, carbs: null } };
  const { foods, protected: kept } = mergeFoodRecords(base, [rec]);
  assert.equal(foods[0].nutrition_per_100g.calories, 111, "manually entered value must survive the import");
  assert.equal(foods[0].nutrition_per_100g.protein, 5);
  assert.equal(kept, 1);
  console.log("✓ CSV import does not overwrite manually entered values");
}

function testCsvRejectsMalformed() {
  const header = "Name,Category,Weekly Amount,Unit,Price/Unit,Weekly Cost,Cal/100g,Prot,Fat,Carbs\n";
  assert.throws(() => parseFoodsCSV(""), /empty/);
  assert.throws(() => parseFoodsCSV("Name,Category\nOats,grain\n"), /Missing column/);
  assert.throws(() => parseFoodsCSV(header + "Oats,grain,1,g\n"), /Row 2: expected 10 columns, found 4/);
  assert.throws(() => parseFoodsCSV(header + "Oats,grain,abc,g,1,1,1,1,1,1\n"), /Row 2: "Weekly Amount" must be a non-negative number, got "abc"/);
  assert.throws(() => parseFoodsCSV(header + "Oats,pastry,1,g,1,1,1,1,1,1\n"), /unknown category "pastry"/);
  assert.throws(() => parseFoodsCSV(header + '"Oats,grain,1,g,1,1,1,1,1,1\n'), /Unterminated quoted field/);
  assert.throws(() => parseFoodsCSV("not,a,food,file\n1,2,3,4\n"), CsvImportError);
  console.log("✓ malformed CSV files are rejected with a readable error");
}

const tests = [
  testCanonicalIds, testNameFallback, testResolve, testBeefShank,
  testMissingNotZeroFilled, testExplicitZero, testNameOnlyPayload,
  testNormaliseDoesNotZeroFill, testValidatorClean, testValidatorCatchesSwap,
  testVitaminDIuConversion, testLegacyVitaminDMigration,
  testCsvRoundTrip, testCsvQuotedFields, testCsvEmptyCellIsMissing,
  testCsvKeepsManualOverrides, testCsvRejectsMalformed,
];

let failed = 0;
for (const t of tests) {
  try { t(); }
  catch (err) {
    failed++;
    console.error(`✗ ${t.name}: ${err.message}`);
  }
}

if (failed === 0) console.log(`\nAll ${tests.length} tests passed.`);
else { console.error(`\n${failed} of ${tests.length} tests failed.`); process.exit(1); }
