// Food database CSV (export + import)
// Pure functions, no UI. The column layout is the one the Database page exports:
// one row per food with its plan amounts and four macros per 100 g.
// An empty cell means "missing" (parsed as null), never zero.

import { CATEGORIES, UNITS } from "../data/schema.js";

export const FOOD_CSV_COLUMNS = [
  "Name", "Category", "Weekly Amount", "Unit", "Price/Unit", "Weekly Cost",
  "Cal/100g", "Prot", "Fat", "Carbs",
];
// "Weekly Cost" is derived (price x amount), so it is exported but ignored on import.
const REQUIRED_COLUMNS = FOOD_CSV_COLUMNS.filter((c) => c !== "Weekly Cost");
const MACRO_COLUMNS = { "Cal/100g": "calories", Prot: "protein", Fat: "fat", Carbs: "carbs" };
const VALID_CATEGORIES = new Set(Object.values(CATEGORIES));
const VALID_UNITS = new Set(Object.values(UNITS).map((u) => u.key));

export class CsvImportError extends Error {}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows) {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function foodsToCSV(foods) {
  const rows = foods.map((f) => [
    f.name, f.category, f.weekly_amount, f.unit, f.price_per_unit,
    (f.price_per_unit * f.weekly_amount).toFixed(2),
    f.nutrition_per_100g.calories, f.nutrition_per_100g.protein,
    f.nutrition_per_100g.fat,      f.nutrition_per_100g.carbs,
  ]);
  return toCSV([FOOD_CSV_COLUMNS, ...rows]);
}

// Returns an array of rows (arrays of strings). Handles quoted fields, commas and
// newlines inside quotes, doubled quotes, CRLF line endings and a leading BOM.
export function parseCSV(text) {
  const src = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (inQuotes) throw new CsvImportError("Unterminated quoted field: the file ends inside a quote.");
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Parses and validates a food CSV. Returns one record per data row:
// { name, category, unit, weekly_amount, price_per_unit, nutrition: { calories, protein, fat, carbs } }
// where any empty cell is null. Throws CsvImportError with a readable message.
export function parseFoodsCSV(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) throw new CsvImportError("The CSV file is empty.");

  const header = rows[0].map((h) => h.trim());
  const index = {};
  header.forEach((h, i) => {
    const canonical = FOOD_CSV_COLUMNS.find((c) => c.toLowerCase() === h.toLowerCase());
    if (canonical) index[canonical] = i;
  });
  const missing = REQUIRED_COLUMNS.filter((c) => index[c] === undefined);
  if (missing.length > 0) {
    throw new CsvImportError(`Missing column(s) in header row: ${missing.join(", ")}.`);
  }
  if (rows.length === 1) throw new CsvImportError("The CSV file has a header but no food rows.");

  const cellText = (r, col) => (r[index[col]] ?? "").trim();
  const number = (r, col, line) => {
    const raw = cellText(r, col);
    if (raw === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      throw new CsvImportError(`Row ${line}: "${col}" must be a non-negative number, got "${raw}".`);
    }
    return n;
  };

  return rows.slice(1).map((r, i) => {
    const line = i + 2;
    if (r.length !== header.length) {
      throw new CsvImportError(`Row ${line}: expected ${header.length} columns, found ${r.length}.`);
    }
    const name = cellText(r, "Name");
    if (!name) throw new CsvImportError(`Row ${line}: "Name" is empty.`);
    const category = cellText(r, "Category") || null;
    if (category && !VALID_CATEGORIES.has(category)) {
      throw new CsvImportError(`Row ${line}: unknown category "${category}" (use ${[...VALID_CATEGORIES].join(", ")}).`);
    }
    const unit = cellText(r, "Unit") || null;
    if (unit && !VALID_UNITS.has(unit)) {
      throw new CsvImportError(`Row ${line}: unknown unit "${unit}".`);
    }
    const nutrition = {};
    for (const [col, key] of Object.entries(MACRO_COLUMNS)) nutrition[key] = number(r, col, line);
    return {
      name, category, unit,
      weekly_amount: number(r, "Weekly Amount", line),
      price_per_unit: number(r, "Price/Unit", line),
      nutrition,
    };
  });
}

// Applies parsed CSV records to the existing food list, matching by name
// (case-insensitive). Rules:
//   - empty cells never change an existing value;
//   - macro values listed in a food's manual_overrides are never overwritten;
//   - rows with no matching food are added as new manual foods.
// Returns { foods, added, updated, protected }.
export function mergeFoodRecords(existing, records) {
  const byName = new Map(existing.map((f, i) => [f.name.trim().toLowerCase(), i]));
  const foods = existing.map((f) => ({ ...f, nutrition_per_100g: { ...f.nutrition_per_100g } }));
  let added = 0, updated = 0, protectedCount = 0;

  for (const rec of records) {
    const key = rec.name.toLowerCase();
    const i = byName.get(key);
    if (i === undefined) {
      byName.set(key, foods.length);
      foods.push(newFoodFromRecord(rec, foods));
      added++;
      continue;
    }
    const food = foods[i];
    for (const field of ["category", "unit", "weekly_amount", "price_per_unit"]) {
      if (rec[field] !== null) food[field] = rec[field];
    }
    for (const [macro, value] of Object.entries(rec.nutrition)) {
      if (value === null) continue;
      if (food.manual_overrides && macro in food.manual_overrides) { protectedCount++; continue; }
      food.nutrition_per_100g[macro] = value;
    }
    updated++;
  }
  return { foods, added, updated, protected: protectedCount };
}

function newFoodFromRecord(rec, foods) {
  const base = rec.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "food";
  let id = base;
  for (let n = 2; foods.some((f) => f.id === id); n++) id = `${base}_${n}`;
  const macro = (k) => rec.nutrition[k] ?? 0;
  return {
    id, name: rec.name,
    category: rec.category ?? CATEGORIES.OTHER,
    quality: "",
    weekly_amount: rec.weekly_amount ?? 0,
    unit: rec.unit ?? UNITS.G.key,
    item_weight_grams: null,
    price_per_unit: rec.price_per_unit ?? 0,
    enabled: true,
    nutrition_per_100g: {
      calories: macro("calories"), protein: macro("protein"), fat: macro("fat"), carbs: macro("carbs"),
      omega3: 0, omega6: 0, creatine: 0, taurine: 0,
      vitamins: {}, minerals: {}, fats: {}, amino_acids: {}, compounds: {},
    },
    source: { provider: "manual", fdcId: null, secondaryId: null, lastSyncedAt: null, version: 0 },
    provenance: {},
    manual_overrides: {},
  };
}
