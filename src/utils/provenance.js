// Tracks the source and confidence of each nutrient value.
// source: "usda" | "secondary_db" | "estimated" | "manual". confidence: "high" | "medium" | "low".

// Returns a flat map like { "vitamins.k2": { source, confidence } }.
export function buildProvenance(nutritionObj, source, confidence, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(nutritionObj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, buildProvenance(value, source, confidence, path));
    } else {
      out[path] = { source, confidence };
    }
  }
  return out;
}

// Entries in overrides win over existing ones.
export function mergeProvenance(existing = {}, overrides = {}) {
  return { ...existing, ...overrides };
}

// Sets source and confidence for the given dot paths.
export function patchProvenance(provenance, paths, source, confidence) {
  const out = { ...provenance };
  for (const path of paths) {
    out[path] = { source, confidence };
  }
  return out;
}
