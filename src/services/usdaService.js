// Syncs a food with USDA data and records where each value came from.

import { fetchUSDAFood } from "./usdaClient.js";
import { buildProvenance } from "../utils/provenance.js";

// Puts the output of mapFDCFood into the app's full nutrition shape.
export function normaliseUSDANutrition(usdaNutrition) {
  const n = usdaNutrition;

  // Keeps a key only when the source reported it. Left-out keys are undefined
  // and skipped by deepMergeUSDA, so they can't overwrite values typed in by hand.
  const omitMissing = (obj) => {
    const out = {};
    Object.keys(obj).forEach((k) => {
      if (obj[k] != null) out[k] = obj[k];
    });
    return out;
  };

  const fatty_acids = omitMissing({
    saturated:       n.fats?.saturated,
    monounsaturated: n.fats?.monounsaturated,
    polyunsaturated: n.fats?.polyunsaturated,
    omega3:          n.omega3 ?? n.fats?.omega3,
    omega6:          n.omega6 ?? n.fats?.omega6,
    dha:             n.fats?.dha,
    epa:             n.fats?.epa,
    arachidonic:     n.fats?.arachidonic,
    linoleic:        n.fats?.linoleic,
    trans:           n.fats?.trans,
  });

  // No zero-filling here. A missing value must not replace a manual taurine,
  // methionine and so on with 0, so "absent" and "0" mean different things.
  const vitamins    = omitMissing(n.vitamins    || {});
  const minerals    = omitMissing(n.minerals    || {});
  const amino_acids = omitMissing(n.amino_acids || {});

  // USDA never reports compounds, so none are emitted. That keeps the
  // secondary database values from being overwritten in the merge.
  const compounds = omitMissing(n.compounds || {});
  if (n.creatine != null) compounds.creatine = n.creatine;

  // USDA reliably reports the macros, so defaulting them to 0 is fine.
  const out = {
    calories: n.calories ?? 0,
    protein:  n.protein  ?? 0,
    fat:      n.fat      ?? 0,
    carbs:    n.carbs    ?? 0,
    vitamins,
    minerals,
    amino_acids,
    fatty_acids,
    compounds,
    fats: fatty_acids,
  };
  if (n.omega3   != null)              out.omega3   = n.omega3;
  if (n.omega6   != null)              out.omega6   = n.omega6;
  if (n.creatine != null)              out.creatine = n.creatine;
  if (amino_acids.taurine != null)     out.taurine  = amino_acids.taurine;
  return out;
}

// Re-fetches USDA data for a food. Returns the food unchanged if it has no USDA source.
export async function syncFoodFromUSDA(food) {
  const fdcId = food?.source?.fdcId ?? food?.fdcId;
  if (!fdcId || food?.source?.provider !== "usda") {
    return food;
  }

  const rawNutrition = await fetchUSDAFood(fdcId);
  const normalised   = normaliseUSDANutrition(rawNutrition);

  // A shallow spread would replace whole sub-objects like amino_acids and drop
  // user-entered values. The deep merge only overwrites keys USDA returned and
  // skips paths marked "manual" in provenance.
  const manualPaths = new Set(
    Object.entries(food.provenance ?? {})
      .filter(([, v]) => v?.source === "manual")
      .map(([k]) => k),
  );
  const mergedNutrition = deepMergeUSDA(food.nutrition_per_100g, normalised, manualPaths);

  // Only mark the paths USDA actually wrote.
  const writtenPaths = collectLeafPaths(normalised).filter((p) => !manualPaths.has(p));
  const newProvenance = buildProvenance(
    Object.fromEntries(writtenPaths.map((p) => [p, 1])),
    "usda",
    "high",
  );

  return {
    ...food,
    nutrition_per_100g: mergedNutrition,
    source: {
      ...food.source,
      provider:    "usda",
      fdcId,
      lastSyncedAt: new Date().toISOString(),
      version: (food.source?.version ?? 0) + 1,
    },
    provenance: {
      ...(food.provenance ?? {}),
      ...newProvenance,
    },
  };
}

// Merges fresh USDA values into the stored nutrition. null, undefined and NaN
// from USDA are skipped (no signal, not zero), and paths in manualPaths are never overwritten.
function deepMergeUSDA(base, usda, manualPaths, parentPath = "") {
  const out = { ...(base || {}) };
  if (!usda || typeof usda !== "object") return out;

  Object.keys(usda).forEach((key) => {
    const path  = parentPath ? `${parentPath}.${key}` : key;
    const value = usda[key];
    if (value == null) return; // skip - USDA didn't report this field

    if (typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMergeUSDA(out[key], value, manualPaths, path);
      return;
    }

    if (typeof value === "number" && Number.isNaN(value)) return;
    if (manualPaths?.has(path)) return; // user-overridden - leave alone
    out[key] = value;
  });

  return out;
}

// Lists the dot path of every value in a nested object, e.g. "vitamins.d".
function collectLeafPaths(obj, prefix = "", out = []) {
  if (!obj || typeof obj !== "object") return out;
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    const path = prefix ? `${prefix}.${k}` : k;
    if (v == null) return;
    if (typeof v === "object" && !Array.isArray(v)) {
      collectLeafPaths(v, path, out);
    } else {
      out.push(path);
    }
  });
  return out;
}
