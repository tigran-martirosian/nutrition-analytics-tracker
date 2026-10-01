import { C } from "../constants.js";

// RDA values, units, display labels for all nutrients
export const NUTRIENT_META = {
  vitamins: {
    a:   { rda: 900,  unit: "μg", label: "Vit A (Retinol)" },
    d:   { rda: 20,   unit: "μg", label: "Vitamin D3" },
    e:   { rda: 15,   unit: "mg", label: "Vitamin E" },
    k1:  { rda: 120,  unit: "μg", label: "Vitamin K1" },
    k2:  { rda: 45,   unit: "μg", label: "Vitamin K2 (MK-4)" },
    b1:  { rda: 1.4,  unit: "mg", label: "B1 Thiamine" },
    b2:  { rda: 1.6,  unit: "mg", label: "B2 Riboflavin" },
    b3:  { rda: 19,   unit: "mg", label: "B3 Niacin" },
    b5:  { rda: 5,    unit: "mg", label: "B5 Pantothenic" },
    b6:  { rda: 1.7,  unit: "mg", label: "B6" },
    b7:  { rda: 30,   unit: "μg", label: "B7 Biotin" },
    b9:  { rda: 400,  unit: "μg", label: "B9 Folate" },
    b12: { rda: 2.4,  unit: "μg", label: "B12" },
    c:   { rda: 90,   unit: "mg", label: "Vitamin C" },
  },
  minerals: {
    calcium:    { rda: 1000, unit: "mg", label: "Calcium" },
    magnesium:  { rda: 420,  unit: "mg", label: "Magnesium" },
    potassium:  { rda: 3400, unit: "mg", label: "Potassium" },
    sodium:     { rda: 2300, unit: "mg", label: "Sodium" },
    phosphorus: { rda: 700,  unit: "mg", label: "Phosphorus" },
    zinc:       { rda: 14,   unit: "mg", label: "Zinc" },
    copper:     { rda: 0.9,  unit: "mg", label: "Copper" },
    iron:       { rda: 8,    unit: "mg", label: "Iron" },
    selenium:   { rda: 55,   unit: "μg", label: "Selenium" },
    iodine:     { rda: 150,  unit: "μg", label: "Iodine" },
    manganese:  { rda: 2.3,  unit: "mg", label: "Manganese" },
    silica:     { unit: "mg", label: "Silica" },
  },
  fats: {
    saturated:      { unit: "g", label: "Saturated Fat" },
    monounsaturated:{ unit: "g", label: "Monounsaturated Fat" },
    polyunsaturated:{ unit: "g", label: "Polyunsaturated Fat" },
    linoleic:       { unit: "g", label: "Linoleic Acid (LA/ω6)" },
    trans:          { unit: "g", label: "Trans Fat" },
  },
  compounds: {
    choline:           { unit: "mg", label: "Choline", group: "Compounds" },
    cholesterol:       { unit: "mg", label: "Cholesterol", group: "Compounds" },
    beta_carotene:     { unit: "mg", label: "Beta-Carotene", group: "Compounds" },
    alpha_carotene:    { unit: "mg", label: "Alpha-Carotene", group: "Compounds" },
    lutein_zeaxanthin: { unit: "mg", label: "Lutein + Zeaxanthin", group: "Compounds" },
  },
};

// Amino acid groups with RDAs and functional descriptions
export const AMINO_GROUPS = {
  "Essential (must eat)": {
    color: C.teal,
    note: "Cannot be synthesized — must come from food",
    aminos: {
      leucine:      { rda_mg_per_kg: 39, fn: "mTOR activation, muscle protein synthesis" },
      lysine:       { rda_mg_per_kg: 30, fn: "Collagen cross-linking, carnitine synthesis, calcium absorption" },
      isoleucine:   { rda_mg_per_kg: 20, fn: "Muscle energy, hemoglobin synthesis, glucose uptake" },
      valine:       { rda_mg_per_kg: 26, fn: "Muscle metabolism, neurological function, energy" },
      threonine:    { rda_mg_per_kg: 15, fn: "Collagen/elastin, gut integrity, immune function" },
      phenylalanine:{ rda_mg_per_kg: 25, fn: "Dopamine/norepinephrine precursor, tyrosine synthesis" },
      tryptophan:   { rda_mg_per_kg:  4, fn: "Serotonin & melatonin precursor, niacin synthesis" },
      histidine:    { rda_mg_per_kg: 10, fn: "Histamine, hemoglobin, antioxidant carnosine" },
      methionine:   { rda_mg_per_kg: 10, fn: "Methylation (SAMe), glutathione precursor, taurine" },
    },
  },
  "Conditional / Semi-essential": {
    color: C.purple,
    note: "Synthesized but often insufficient under stress, growth, or illness",
    aminos: {
      arginine: { rda_mg_per_kg: 0, fn: "Nitric oxide synthesis, wound healing, immune function" },
      cysteine: { rda_mg_per_kg: 0, fn: "Glutathione, keratin, taurine synthesis" },
    },
  },
  "Structural / Connective Tissue": {
    color: C.orange,
    note: "Critical for collagen, tendons, skin, and gut lining",
    aminos: {
      glycine:       { rda_mg_per_kg: 0, fn: "Collagen (33% glycine), bile acids, glutathione, sleep quality" },
      proline:       { rda_mg_per_kg: 0, fn: "Collagen structure, wound healing, antioxidant" },
      hydroxyproline:{ rda_mg_per_kg: 0, fn: "Collagen stability — found only in animal connective tissue" },
    },
  },
};

// Which nutrients appear on the Dashboard summary cards
export const DASHBOARD_NUTRIENTS = [
  { k: "d",         type: "vit", ...NUTRIENT_META.vitamins.d },
  { k: "potassium", type: "min", ...NUTRIENT_META.minerals.potassium },
  { k: "sodium",    type: "min", ...NUTRIENT_META.minerals.sodium },
  { k: "magnesium", type: "min", ...NUTRIENT_META.minerals.magnesium },
];
