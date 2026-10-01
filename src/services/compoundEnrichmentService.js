// Extra values for nutrients USDA does not reliably cover (K2, creatine, taurine,
// hydroxyproline, carnosine, anserine). If nothing is known, no value is made up.

import { patchProvenance } from "../utils/provenance.js";

// Values per 100 g, in mg unless noted.
// Sources: Daley et al. (2010), Purchas & Busboom (2005), Toldra et al., FooDB.ca.
const COMPOUND_DB = {
  chicken_breast: { k2: 0.4, creatine: 300, taurine: 20,  hydroxyproline: 100,  carnosine: 180, anserine: 400 },
  beef_sirloin:   { k2: 1.5, creatine: 450, taurine: 60,  hydroxyproline: 290,  carnosine: 360, anserine: 50 },
  pork:           { k2: 0.5, creatine: 500, taurine: 50,  hydroxyproline: 280,  carnosine: 650, anserine: 320 },
  shrimp:         { k2: 0,   creatine: 100, taurine: 250, hydroxyproline: 0,    carnosine: 30,  anserine: 80  },
  eggs:           { k2: 1.2, creatine: 2,   taurine: 5,   hydroxyproline: 0,    carnosine: 0,   anserine: 0  },
  milk:           { k2: 1.0, creatine: 0,   taurine: 2,   hydroxyproline: 0,    carnosine: 0,   anserine: 0  },
  // Plant foods have close to zero for all of these, so they are not listed.
};

// Rough estimate by food type, used when the food is not in COMPOUND_DB.
function classEstimate(food) {
  const cat = food.category ?? "";
  const name = (food.name ?? "").toLowerCase();

  if (cat === "meat" || name.includes("beef") || name.includes("lamb") || name.includes("pork")) {
    return {
      compounds: { creatine: 350 / 1000, carnosine: 250 / 1000 },
      amino_acids: { taurine: 50 / 1000, hydroxyproline: 200 / 1000 },
      confidence: "low",
    };
  }
  if (cat === "seafood" || name.includes("fish") || name.includes("salmon") || name.includes("tuna")) {
    return {
      compounds: { creatine: 200 / 1000, carnosine: 50 / 1000 },
      amino_acids: { taurine: 100 / 1000 },
      confidence: "low",
    };
  }
  if (cat === "dairy_eggs") {
    return {
      vitamins: { k2: 1.0 },
      confidence: "low",
    };
  }
  return null; // Plant foods, water, oils - no estimate
}

// Converts a table entry (mg) into the nutrition shape (g).
function entryToNutrition(entry) {
  const out = {};
  if (entry.k2 > 0)             { out.vitamins    = { k2: entry.k2 }; }
  if (entry.creatine > 0)       { out.compounds   = { ...out.compounds, creatine: entry.creatine / 1000 }; }
  if (entry.carnosine > 0)      { out.compounds   = { ...out.compounds, carnosine: entry.carnosine / 1000 }; }
  if (entry.anserine > 0)       { out.compounds   = { ...out.compounds, anserine: entry.anserine / 1000 }; }
  if (entry.taurine > 0)        { out.amino_acids = { ...out.amino_acids, taurine: entry.taurine / 1000 }; }
  if (entry.hydroxyproline > 0) { out.amino_acids = { ...out.amino_acids, hydroxyproline: entry.hydroxyproline / 1000 }; }
  return out;
}

// Returns { nutrition, confidence, source } for a food, or null if nothing is known.
export function getSecondaryEnrichment(food) {
  const entry = COMPOUND_DB[food.id];

  if (entry) {
    return {
      nutrition:  entryToNutrition(entry),
      confidence: "medium",
      source:     "secondary_db",
    };
  }

  const est = classEstimate(food);
  if (est) {
    const { confidence, ...nutrition } = est;
    return { nutrition, confidence, source: "estimated" };
  }

  return null;
}

// Adds the secondary values to a food and updates its provenance.
export function enrichFoodWithSecondaryCompounds(food, mergedNutrition) {
  const enrichment = getSecondaryEnrichment(food);
  if (!enrichment) return { ...food, nutrition_per_100g: mergedNutrition };

  const { nutrition: extras, confidence, source } = enrichment;

  const enrichedPaths = [];
  function collectPaths(obj, prefix = "") {
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === "object") {
        collectPaths(val, path);
      } else {
        enrichedPaths.push(path);
      }
    }
  }
  collectPaths(extras);

  const newProvenance = patchProvenance(food.provenance ?? {}, enrichedPaths, source, confidence);

  return {
    ...food,
    nutrition_per_100g: mergedNutrition,
    _pendingEnrichment: extras,  // consumed by syncFoodNutrition
    provenance: newProvenance,
  };
}
