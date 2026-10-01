// Runs the full nutrition sync for one food: USDA pull, secondary values, merge, manual overrides.
// Never changes the food it is given, it returns a new object.

import { syncFoodFromUSDA }                   from "../services/usdaService.js";
import { getSecondaryEnrichment }              from "../services/compoundEnrichmentService.js";
import { mergeNutrition, applyManualOverrides } from "../utils/mergeNutrition.js";
import { patchProvenance } from "../utils/provenance.js";

export async function syncFoodNutrition(food) {
  let updated = structuredClone(food);

  const hasFdc = updated?.source?.fdcId || updated?.fdcId;
  if (hasFdc) {
    try {
      updated = await syncFoodFromUSDA(updated);
    } catch (err) {
      console.warn(`[syncFoodNutrition] USDA fetch failed for ${food.id}:`, err.message);
      // Keep going with the existing nutrition instead of crashing
    }
  }

  const enrichment = getSecondaryEnrichment(updated);

  if (enrichment) {
    const { nutrition: extras, confidence, source: enrichSource } = enrichment;

    // USDA values win for standard nutrients, extras only fill gaps
    const merged = mergeNutrition(updated.nutrition_per_100g, extras, false);

    // Manual overrides always win
    const withOverrides = applyManualOverrides(merged, updated.manual_overrides ?? {});

    const enrichedPaths = [];
    _collectPaths(extras, "", enrichedPaths);

    const newProvenance = patchProvenance(
      updated.provenance ?? {},
      enrichedPaths,
      enrichSource,
      confidence,
    );

    const overridePaths = Object.keys(updated.manual_overrides ?? {});
    const finalProvenance = patchProvenance(newProvenance, overridePaths, "manual", "high");

    updated = {
      ...updated,
      nutrition_per_100g: withOverrides,
      provenance: finalProvenance,
    };
  } else {
    if (updated.manual_overrides && Object.keys(updated.manual_overrides).length > 0) {
      const withOverrides = applyManualOverrides(
        updated.nutrition_per_100g,
        updated.manual_overrides,
      );
      const overridePaths = Object.keys(updated.manual_overrides);
      updated = {
        ...updated,
        nutrition_per_100g: withOverrides,
        provenance: patchProvenance(updated.provenance ?? {}, overridePaths, "manual", "high"),
      };
    }
  }

  delete updated._pendingEnrichment;

  return updated;
}

// Adds a basic source block to a food that has none, so the sync can work with it.
export function attachSourceMetadata(food, fdcId = null) {
  if (food.source) return food; // already has metadata
  return {
    ...food,
    source: {
      provider:     fdcId ? "usda" : "manual",
      fdcId:        fdcId ?? null,
      secondaryId:  null,
      lastSyncedAt: null,
      version:      0,
    },
    provenance:       food.provenance       ?? {},
    manual_overrides: food.manual_overrides ?? {},
  };
}

function _collectPaths(obj, prefix, out) {
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      _collectPaths(val, path, out);
    } else {
      out.push(path);
    }
  }
}
