// Merges extra nutrition values into a base nutrition_per_100g and returns a new object.
// A base value above 0 is kept unless force is true. Missing or zero values are filled in.

export function mergeNutrition(base, extras, force = false) {
  if (!extras || typeof extras !== "object") return base;
  const result = structuredClone(base);
  _deepMerge(result, extras, force);
  return result;
}

function _deepMerge(target, source, force) {
  for (const [key, srcVal] of Object.entries(source)) {
    if (srcVal === null || srcVal === undefined) continue;

    if (typeof srcVal === "object" && !Array.isArray(srcVal)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      _deepMerge(target[key], srcVal, force);
    } else {
      const existing = target[key];
      if (existing === undefined || existing === null || existing === 0 || force) {
        target[key] = srcVal;
      }
    }
  }
}

// Overrides are dot paths, e.g. { "vitamins.k2": 6.2, "compounds.creatine": 450 }.
export function applyManualOverrides(nutrition, overrides = {}) {
  if (!overrides || Object.keys(overrides).length === 0) return nutrition;
  const result = structuredClone(nutrition);
  for (const [dotPath, value] of Object.entries(overrides)) {
    _setPath(result, dotPath, value);
  }
  return result;
}

function _setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
