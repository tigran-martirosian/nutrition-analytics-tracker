// Key names and data shapes for the whole app.
// If the data source changes, only this file should need to change.

export const VITAMIN_KEYS = {
  A: "a", D: "d", E: "e", K1: "k1", K2: "k2",
  B1: "b1", B2: "b2", B3: "b3", B5: "b5", B6: "b6",
  B7: "b7", B9: "b9", B12: "b12", C: "c",
};

export const MINERAL_KEYS = {
  CALCIUM: "calcium", MAGNESIUM: "magnesium", POTASSIUM: "potassium",
  SODIUM: "sodium", PHOSPHORUS: "phosphorus", ZINC: "zinc",
  COPPER: "copper", IRON: "iron", SELENIUM: "selenium",
  IODINE: "iodine", MANGANESE: "manganese", SILICA: "silica",
};

export const MACRO_KEYS = {
  CALORIES: "calories", PROTEIN: "protein", FAT: "fat", CARBS: "carbs",
  OMEGA3: "omega3", OMEGA6: "omega6", CREATINE: "creatine", TAURINE: "taurine",
};

export const FAT_KEYS = {
  SATURATED: "saturated", MONOUNSATURATED: "monounsaturated",
  POLYUNSATURATED: "polyunsaturated", LINOLEIC: "linoleic", TRANS: "trans",
};

export const AMINO_KEYS = [
  "glycine", "proline", "hydroxyproline", "methionine", "cysteine",
  "tryptophan", "leucine", "lysine", "isoleucine", "valine",
  "threonine", "phenylalanine", "histidine", "arginine",
  "taurine",
];

// Compound keys - bioactive molecules not covered by USDA
export const COMPOUND_KEYS = [
  "creatine", "carnosine", "anserine", "cholesterol", "choline", "collagen_estimate",
  "beta_carotene", "alpha_carotene", "lutein_zeaxanthin",
];

// Extended fatty acid keys (superset of FAT_KEYS for analytics)
export const FATTY_ACID_KEYS = {
  SATURATED:       "saturated",
  MONOUNSATURATED: "monounsaturated",
  POLYUNSATURATED: "polyunsaturated",
  OMEGA3:          "omega3",
  OMEGA6:          "omega6",
  DHA:             "dha",
  EPA:             "epa",
  ARACHIDONIC:     "arachidonic",
  LINOLEIC:        "linoleic",
  TRANS:           "trans",
};

// Source provider constants
export const SOURCE_PROVIDERS = {
  USDA:        "usda",
  MANUAL:      "manual",
  SECONDARY:   "secondary",
  MERGED:      "merged",
};

// Confidence levels for provenance tracking
export const CONFIDENCE = {
  HIGH:   "high",    // Direct structured source, strong mapping
  MEDIUM: "medium",  // Secondary database or literature-derived
  LOW:    "low",     // Estimated from food class / tissue type
};

export const CATEGORIES = {
  MEAT: "meat", SEAFOOD: "seafood", DAIRY_EGGS: "dairy_eggs",
  GRAIN: "grain", VEGETABLE: "vegetable", FRUIT: "fruit", OTHER: "other",
};

export const UNITS = {
  G:       { key: "g",      toGrams: 1 },
  KG:      { key: "kg",     toGrams: 1000 },
  LB:      { key: "lb",     toGrams: 453.592 },
  OZ:      { key: "oz",     toGrams: 28.3495 },
  GALLON:  { key: "gallon", toGrams: 3785.41 },
  QUART:   { key: "quart",  toGrams: 946.353 },
  PINT:    { key: "pint",   toGrams: 473.176 },
  CUP:     { key: "cup",    toGrams: 240 },
  TBSP:    { key: "tbsp",   toGrams: 14.3 },
  TSP:     { key: "tsp",    toGrams: 4.7 },
  ML:      { key: "ml",     toGrams: 1 },
  L:       { key: "l",      toGrams: 1000 },
  EACH:    { key: "each",   toGrams: null },
  COUNT:   { key: "count",  toGrams: null },
};

// Unit conversion factors for nutrients stored in non-standard units
export const NUTRIENT_UNIT_CONVERSIONS = {
  vitamins: {
    d: { IU: 0.025 }, // IU -> μg
    a: { IU: 0.3 },   // IU -> μg
  },
};
