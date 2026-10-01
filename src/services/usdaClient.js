// USDA FoodData Central API client. Docs: https://fdc.nal.usda.gov/api-guide.html
// DEMO_KEY is rate-limited to 30 requests per hour per IP. Put your own key in VITE_USDA_API_KEY (see .env.example).
// Free key signup: https://fdc.nal.usda.gov/api-key-signup.html

import {
  USDA_AMINO_ID_MAP,
  resolveAminoPath,
  APP_USDA_AMINO_KEYS,
} from "../data/usdaNutrientMap.js";

export const USDA_API_KEY = import.meta.env?.VITE_USDA_API_KEY || "DEMO_KEY";
const API_KEY = USDA_API_KEY;
const BASE    = "https://api.nal.usda.gov/fdc/v1";

// USDA nutrient id -> app field. Amino acids are not listed here, they are
// mapped in usdaNutrientMap.js. "add: true" means several ids add up into one field.
const NUTRIENT_MAP = {
  1008: { path: "calories"  },
  1003: { path: "protein"   },
  1004: { path: "fat"       },
  1005: { path: "carbs"     },

  1404: { path: "omega3", add: true },  // ALA (18:3 n-3)
  1316: { path: "omega3", add: true },  // EPA (20:5 n-3)
  1314: { path: "omega3", add: true },  // DHA (22:6 n-3)
  1313: { path: "omega6", add: true },  // Linoleic 18:2 n-6
  1408: { path: "omega6", add: true },  // Arachidonic 20:4 n-6

  1258: { path: "fats.saturated"       },
  1253: { path: "compounds.cholesterol" },
  1292: { path: "fats.monounsaturated" },
  1293: { path: "fats.polyunsaturated" },
  // Linoleic (1313) also feeds fats.linoleic, see NUTRIENT_ALIASES below.
  // An object can't have the same key twice, so it is not listed again here.
  1257: { path: "fats.trans"           },

  1106: { path: "vitamins.a"   },  // Retinol (μg) - preformed only
  1110: { path: "vitamins.d", transform: (v) => v * 0.025 }, // Vitamin D (D2+D3, IU -> μg)
  1114: { path: "vitamins.d"   },  // Vitamin D (D2+D3, μg)
  1109: { path: "vitamins.e"   },  // Alpha-tocopherol (mg)
  1185: { path: "vitamins.k1"  },  // Phylloquinone (μg)
  // K2 is not in standard USDA data, the secondary enrichment fills it.
  1165: { path: "vitamins.b1"  },  // Thiamine (mg)
  1166: { path: "vitamins.b2"  },  // Riboflavin (mg)
  1167: { path: "vitamins.b3"  },  // Niacin (mg)
  1170: { path: "vitamins.b5"  },  // Pantothenic acid (mg)
  1175: { path: "vitamins.b6"  },  // B6 (mg)
  1176: { path: "vitamins.b7"  },  // Biotin (μg)
  1177: { path: "vitamins.b9"  },  // Folate total (μg)
  1178: { path: "vitamins.b12" },  // B12 (μg)
  1162: { path: "vitamins.c"   },  // Vitamin C (mg)

  1087: { path: "minerals.calcium"    },
  1090: { path: "minerals.magnesium"  },
  1092: { path: "minerals.potassium"  },
  1093: { path: "minerals.sodium"     },
  1091: { path: "minerals.phosphorus" },
  1095: { path: "minerals.zinc"       },
  1098: { path: "minerals.copper"     },
  1089: { path: "minerals.iron"       },
  1103: { path: "minerals.selenium"   },
  1100: { path: "minerals.iodine"     },
  1101: { path: "minerals.manganese"  },
};

// Ids that feed a second app field as well as the one in NUTRIENT_MAP.
const NUTRIENT_ALIASES = [
  { id: 1313, path: "fats.linoleic" }, // also summed into omega6 above
];

function setPath(obj, path, value, add = false) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const key = parts[parts.length - 1];
  cur[key] = add ? (cur[key] || 0) + value : value;
}

// Turns a USDA food detail object into our nutrition_per_100g shape.
// Amino acids USDA does not report stay undefined (not 0), so they can't
// overwrite a value typed in by hand.
export function mapFDCFood(fdcFood) {
  const nutrition = {
    calories: 0, protein: 0, fat: 0, carbs: 0,
    omega3: 0, omega6: 0, creatine: 0, taurine: 0,
    vitamins:    {},
    minerals:    {},
    fats:        {},
    compounds:   {},
    amino_acids: {},   // only filled with fields USDA reports
  };

  const nutrients = fdcFood.foodNutrients || [];
  nutrients.forEach((n) => {
    // The full payload nests the metadata under n.nutrient, the search payload flattens it.
    const id    = n.nutrient?.id    ?? n.nutrient?.number ?? n.nutrientId   ?? null;
    const name  = n.nutrient?.name  ?? n.nutrientName     ?? "";
    const value = n.amount ?? n.value ?? null;
    if (value == null || Number.isNaN(value)) return;

    // Amino acids are matched by nutrient id (then name), never by position.
    const aminoPath = resolveAminoPath(id, name);
    if (aminoPath) {
      setPath(nutrition, aminoPath, value, false);
      return;
    }

    const mapping = NUTRIENT_MAP[id];
    if (mapping) {
      const mappedValue = mapping.transform ? mapping.transform(value) : value;
      setPath(nutrition, mapping.path, mappedValue, !!mapping.add);
    }
    NUTRIENT_ALIASES.forEach((alias) => {
      if (alias.id === id) setPath(nutrition, alias.path, value, false);
    });
  });

  const round  = (v, d = 3) => parseFloat(v.toFixed(d));
  const roundO = (obj, d = 3) => {
    Object.keys(obj).forEach((k) => { obj[k] = round(obj[k], d); });
  };
  nutrition.calories = round(nutrition.calories, 1);
  nutrition.protein  = round(nutrition.protein);
  nutrition.fat      = round(nutrition.fat);
  nutrition.carbs    = round(nutrition.carbs);
  nutrition.omega3   = round(nutrition.omega3);
  nutrition.omega6   = round(nutrition.omega6);
  roundO(nutrition.vitamins);
  roundO(nutrition.minerals);
  roundO(nutrition.fats);
  roundO(nutrition.compounds);
  roundO(nutrition.amino_acids);

  // Vite sets PROD at build time. In tests it is undefined, so the check runs.
  const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD === true;
  if (!isProd) validateAminoAcids(nutrition.amino_acids, fdcFood);

  return nutrition;
}

// Dev-only check that warns when the amino acid numbers look like a mapping mistake.
// Skipped when there is little data, so plant foods with near-zero values don't warn.
export function validateAminoAcids(aa, sourceFood) {
  if (!aa || typeof aa !== "object") return;
  const present = Object.values(aa).filter((v) => typeof v === "number" && v > 0);
  if (present.length < 4) return; // not enough data - skip

  const warn = (msg, extra) => {
    console.warn(
      `[USDA amino validator] ${sourceFood?.description || sourceFood?.fdcId || "food"}: ${msg}`,
      extra ?? aa,
    );
  };

  // Leucine is always higher than isoleucine in animal foods, so the reverse
  // means the two ids were probably swapped.
  if (aa.leucine != null && aa.isoleucine != null
      && aa.leucine > 0 && aa.leucine < aa.isoleucine) {
    warn("leucine < isoleucine — likely swapped IDs (1212/1213).");
  }

  // Lysine in beef and poultry is normally at least as high as methionine.
  if (aa.lysine != null && aa.methionine != null
      && aa.lysine > 0 && aa.lysine < aa.methionine) {
    warn("lysine < methionine — likely swapped IDs (1214/1215).");
  }

  if (aa.histidine === 0 && present.length >= 6) {
    warn("histidine reported as 0 while other amino acids are present — check ID 1221.");
  }

  // Collagen-rich foods can break this, so it is only informational.
  if (aa.glycine != null && aa.proline != null
      && aa.glycine > 0 && aa.proline > 0
      && aa.proline > aa.glycine * 1.5) {
    warn("proline >> glycine — possible 1225/1226 swap (informational only).");
  }
}

// Returns a list of { fdcId, description, dataType, category }.
export async function searchUSDA(query) {
  const url = `${BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=12&api_key=${API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`USDA search failed: ${res.status}`);
  const data = await res.json();
  return (data.foods || []).map((f) => ({
    fdcId:       f.fdcId,
    description: f.description,
    dataType:    f.dataType,
    category:    f.foodCategory || "",
  }));
}

// Returns the nutrition_per_100g object for one food.
export async function fetchUSDAFood(fdcId) {
  const url = `${BASE}/food/${fdcId}?api_key=${API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`USDA fetch failed: ${res.status}`);
  const data = await res.json();
  return mapFDCFood(data);
}

// Same as fetchUSDAFood but also returns the source info for the food entry.
export async function fetchUSDAFoodWithMeta(fdcId) {
  const nutrition = await fetchUSDAFood(fdcId);
  const source = {
    provider:     "usda",
    fdcId,
    secondaryId:  null,
    lastSyncedAt: new Date().toISOString(),
    version:      1,
  };
  return { nutrition, source };
}

export { USDA_AMINO_ID_MAP, APP_USDA_AMINO_KEYS };
