// USDA FoodData Central nutrient ids -> app amino acid fields.
// Always match by nutrient id, never by array position. Use the name only when the id is missing.
// Ids: https://fdc.nal.usda.gov/api-spec/fdc_api.html (1xxx Foundation / SR amino acid block).

// Only amino acids in AMINO_KEYS (data/schema.js) are mapped to app fields.
const AMINO_PATH = {
  tryptophan:    "amino_acids.tryptophan",
  threonine:     "amino_acids.threonine",
  isoleucine:    "amino_acids.isoleucine",
  leucine:       "amino_acids.leucine",
  lysine:        "amino_acids.lysine",
  methionine:    "amino_acids.methionine",
  cysteine:      "amino_acids.cysteine",
  phenylalanine: "amino_acids.phenylalanine",
  valine:        "amino_acids.valine",
  arginine:      "amino_acids.arginine",
  histidine:     "amino_acids.histidine",
  glycine:       "amino_acids.glycine",
  proline:       "amino_acids.proline",
};

export const USDA_AMINO_ID_MAP = Object.freeze({
  1210: AMINO_PATH.tryptophan,
  1211: AMINO_PATH.threonine,
  1212: AMINO_PATH.isoleucine,
  1213: AMINO_PATH.leucine,
  1214: AMINO_PATH.lysine,
  1215: AMINO_PATH.methionine,
  1216: AMINO_PATH.cysteine,      // USDA labels this "Cystine" - same field
  1217: AMINO_PATH.phenylalanine,
  // 1218 Tyrosine - not in app schema yet
  1219: AMINO_PATH.valine,
  1220: AMINO_PATH.arginine,
  1221: AMINO_PATH.histidine,
  // 1222 Alanine, 1223 Aspartic, 1224 Glutamic - not in app schema yet
  1225: AMINO_PATH.glycine,
  1226: AMINO_PATH.proline,
  // 1227 Serine - not in app schema yet
});

// Used when the nutrient id is missing. Keys are already normalized (lowercase letters only).
// USDA says "Cystine" but the assay measures the oxidised form of cysteine, so both
// go to the same field.
export const USDA_AMINO_NAME_MAP = Object.freeze({
  tryptophan:    AMINO_PATH.tryptophan,
  threonine:     AMINO_PATH.threonine,
  isoleucine:    AMINO_PATH.isoleucine,
  leucine:       AMINO_PATH.leucine,
  lysine:        AMINO_PATH.lysine,
  methionine:    AMINO_PATH.methionine,
  cystine:       AMINO_PATH.cysteine,
  cysteine:      AMINO_PATH.cysteine,
  phenylalanine: AMINO_PATH.phenylalanine,
  valine:        AMINO_PATH.valine,
  arginine:      AMINO_PATH.arginine,
  histidine:     AMINO_PATH.histidine,
  glycine:       AMINO_PATH.glycine,
  proline:       AMINO_PATH.proline,
});

// Lowercases and keeps letters only, because USDA spells names differently between datasets.
export function normalizeNutrientName(raw) {
  if (raw == null) return "";
  return String(raw).toLowerCase().replace(/[^a-z]/g, "");
}

// Tries the id first, then the name. Returns e.g. "amino_acids.leucine" or null.
export function resolveAminoPath(usdaId, usdaName) {
  if (usdaId != null && USDA_AMINO_ID_MAP[usdaId]) {
    return USDA_AMINO_ID_MAP[usdaId];
  }
  const key = normalizeNutrientName(usdaName);
  if (key && USDA_AMINO_NAME_MAP[key]) {
    return USDA_AMINO_NAME_MAP[key];
  }
  return null;
}

// App field names (without "amino_acids.") fed by USDA. Used by the validator and tests.
export const APP_USDA_AMINO_KEYS = Object.freeze(
  Array.from(new Set(Object.values(USDA_AMINO_ID_MAP)))
    .map((p) => p.replace(/^amino_acids\./, "")),
);
