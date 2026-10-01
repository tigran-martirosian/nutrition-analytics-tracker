import { UNITS, NUTRIENT_UNIT_CONVERSIONS, AMINO_KEYS, COMPOUND_KEYS } from "../data/schema.js";
import { NUTRIENT_META } from "../data/nutrientMeta.js";
import { C } from "../constants.js";

// Weekly weight of a food in grams. Null for each/count units without item_weight_grams.
export function getWeightInGrams(food) {
  if (food.unit === "each" || food.unit === "count") {
    if (food.item_weight_grams && food.item_weight_grams > 0)
      return food.item_weight_grams * food.weekly_amount;
    return null;
  }
  const entry = Object.values(UNITS).find((u) => u.key === food.unit);
  return entry?.toGrams ? entry.toGrams * food.weekly_amount : null;
}

// Converts a raw vitamin D value to μg when the food stores it in IU.
export function vitD_toUg(rawValue, food) {
  const conv = NUTRIENT_UNIT_CONVERSIONS.vitamins.d.IU;
  return food?.nutrition_units?.vitamins?.d === "IU"
    ? rawValue * conv
    : rawValue;
}

// Taurine and creatine are stored in grams per 100 g. The top-level fields mirror
// amino_acids.taurine and compounds.creatine, so only one of them is counted.
export function getTaurinePer100g(n) {
  if (!n) return 0;
  const aa = n.amino_acids?.taurine ?? 0;
  const top = n.taurine ?? 0;
  let val = aa > 0 ? aa : top;
  // No food has 1 g/100g or more taurine (oysters have about 0.7), so a bigger number must be mg.
  if (val >= 1) val = val / 1000; // mg -> g
  return val;
}

export function getCreatinePer100g(n) {
  if (!n) return 0;
  const cmp = n.compounds?.creatine ?? 0;
  const top = n.creatine ?? 0;
  let val = cmp > 0 ? cmp : top;
  // Meat has at most about 0.5 g/100g creatine, same check as taurine.
  if (val >= 1) val = val / 1000; // mg -> g
  return val;
}

// Makes stored foods use grams per 100 g, with the top-level and nested fields holding the same number.
export function migrateTaurineAndCreatine(foods) {
  if (!Array.isArray(foods)) return foods;
  return foods.map((food) => {
    const n = food?.nutrition_per_100g;
    if (!n) return food;

    const tau = getTaurinePer100g(n);
    const cre = getCreatinePer100g(n);

    const sameTau = n.taurine === tau && n.amino_acids?.taurine === tau;
    const sameCre = n.creatine === cre && n.compounds?.creatine === cre;
    if (sameTau && sameCre) return food;

    return {
      ...food,
      nutrition_per_100g: {
        ...n,
        taurine: tau,
        creatine: cre,
        amino_acids: { ...(n.amino_acids ?? {}), taurine: tau },
        compounds:   { ...(n.compounds ?? {}),   creatine: cre },
      },
    };
  });
}

export function migrateVitaminDUnits(foods) {
  if (!Array.isArray(foods)) return foods;
  return foods.map((food) => {
    const raw = food?.nutrition_per_100g?.vitamins?.d;
    const unit = food?.nutrition_units?.vitamins?.d;
    const fromUSDA = food?.source?.provider === "usda" || food?.fdcId != null;
    if (!fromUSDA || unit || typeof raw !== "number" || raw <= 100) return food;

    return {
      ...food,
      nutrition_per_100g: {
        ...food.nutrition_per_100g,
        vitamins: {
          ...food.nutrition_per_100g.vitamins,
          d: raw * NUTRIENT_UNIT_CONVERSIONS.vitamins.d.IU,
        },
      },
    };
  });
}

export function computeTotals(enabledFoods) {
  const weekly = {
    calories: 0, protein: 0, fat: 0, carbs: 0,
    omega3: 0, omega6: 0, cost: 0, creatine: 0, taurine: 0,
    vitamins:    Object.fromEntries(Object.keys(NUTRIENT_META.vitamins).map((k) => [k, 0])),
    minerals:    Object.fromEntries(Object.keys(NUTRIENT_META.minerals).map((k) => [k, 0])),
    fats:        Object.fromEntries(Object.keys(NUTRIENT_META.fats).map((k) => [k, 0])),
    amino_acids: Object.fromEntries(AMINO_KEYS.map((k) => [k, 0])),
    compounds:   Object.fromEntries(COMPOUND_KEYS.map((k) => [k, 0])),
    fatty_acids: { saturated:0, monounsaturated:0, polyunsaturated:0, omega3:0, omega6:0, dha:0, epa:0, arachidonic:0 },
  };

  enabledFoods.forEach((food) => {
    const grams = getWeightInGrams(food);
    if (grams === null) return;
    const mult = grams / 100;
    const n = food.nutrition_per_100g;

    // Taurine is in grams per 100 g. Only one of the two mirrored fields is counted, never both.
    const taurinePer100 = getTaurinePer100g(n);
    const creatinePer100 = getCreatinePer100g(n);
    const hydroxyprolinePer100 = n.amino_acids?.hydroxyproline || 0;

    weekly.calories  += n.calories * mult;
    weekly.protein   += n.protein * mult;
    weekly.fat       += n.fat * mult;
    weekly.carbs     += n.carbs * mult;
    weekly.omega3    += (n.omega3  || 0) * mult;
    weekly.omega6    += (n.omega6  || 0) * mult;
    weekly.creatine  += creatinePer100 * mult;
    weekly.taurine   += taurinePer100 * mult;
    weekly.cost      += food.price_per_unit * food.weekly_amount;

    Object.keys(weekly.vitamins).forEach((v) => {
      const raw = n.vitamins?.[v] || 0;
      weekly.vitamins[v] += (v === "d" ? vitD_toUg(raw, food) : raw) * mult;
    });
    Object.keys(weekly.minerals).forEach((m) => {
      weekly.minerals[m] += (n.minerals?.[m] || 0) * mult;
    });
    Object.keys(weekly.fats).forEach((f) => {
      weekly.fats[f] += (n.fats?.[f] || 0) * mult;
    });
    Object.keys(weekly.amino_acids).forEach((a) => {
      // Taurine uses the unified value so the Amino and Special tabs agree.
      const per100 = a === "taurine" ? taurinePer100 : (n.amino_acids?.[a] || 0);
      weekly.amino_acids[a] += per100 * mult;
    });
    Object.keys(weekly.compounds).forEach((c) => {
      const per100 = c === "creatine"
        ? creatinePer100
        : c === "collagen_estimate"
        ? (n.compounds?.collagen_estimate ?? hydroxyprolinePer100 * 7.5)
        : (n.compounds?.[c] ?? n[c] ?? 0);
      weekly.compounds[c] += per100 * mult;
    });
    Object.keys(weekly.fatty_acids).forEach((fa) => {
      const per100 = fa === "omega3"
        ? (n.fatty_acids?.omega3 ?? n.omega3 ?? n.fats?.omega3 ?? 0)
        : fa === "omega6"
        ? (n.fatty_acids?.omega6 ?? n.omega6 ?? n.fats?.omega6 ?? 0)
        : (n.fatty_acids?.[fa] ?? n.fats?.[fa] ?? 0);
      weekly.fatty_acids[fa] += per100 * mult;
    });
  });

  const daily = {};
  Object.keys(weekly).forEach((k) => {
    if (typeof weekly[k] === "object") {
      daily[k] = {};
      Object.keys(weekly[k]).forEach((sk) => (daily[k][sk] = weekly[k][sk] / 7));
    } else {
      daily[k] = weekly[k] / 7;
    }
  });

  return { weekly, daily };
}

// Mifflin-St Jeor BMR for the calorie target. Protein target is 1 g per lb.
export function calcTargets(stats) {
  const { weightLb, heightIn, age, sex, activity } = stats;
  const wKg = weightLb * 0.453592;
  const hCm = heightIn * 2.54;
  const bmr =
    sex === "male"
      ? 10 * wKg + 6.25 * hCm - 5 * age + 5
      : 10 * wKg + 6.25 * hCm - 5 * age - 161;
  const actMult = {
    sedentary:   1.2,
    light:       1.375,
    moderate:    1.55,
    active:      1.725,
    very_active: 1.9,
  }[activity] || 1.55;
  const calories = Math.round(bmr * actMult);
  const protein  = Math.round(weightLb * 1); // 1g protein per 1lb bodyweight
  return { calories, protein };
}

export const pct      = (val, rda) => Math.round((val / rda) * 100);
export const fmtPct   = (p) => `${p}%`;
export const rdaColor = (p) =>
  p < 50  ? C.red
  : p < 80  ? C.orange
  : p > 300 ? C.purple
  : p > 200 ? C.orange
  : C.accent;
