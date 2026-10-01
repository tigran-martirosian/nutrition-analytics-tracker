import { useState, useMemo } from "react";
import {
  PieChart, Pie, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { C, CATEGORY_COLORS, TT, STATUS, FONT, TYPE, R, UNIT_LABELS, BTN } from "../constants.js";
import { NUTRIENT_META, AMINO_GROUPS } from "../data/nutrientMeta.js";
import { AMINO_KEYS, COMPOUND_KEYS, FATTY_ACID_KEYS } from "../data/schema.js";
import {
  getWeightInGrams,
  getTaurinePer100g, getCreatinePer100g,
  pct, fmtPct,
} from "../utils/nutrition.js";
import NutrientBar from "../components/NutrientBar.jsx";
import NutrientDrillDown from "../components/NutrientDrillDown.jsx";
import CategoryDot from "../components/CategoryDot.jsx";
import MacroStackedBar from "../components/MacroStackedBar.jsx";
import { EmptyState, PageShell, SegmentedToggle } from "../components/ui.jsx";

// Analytics-local tooltip theme (bigger type, roomier padding)
const TT_BIG = {
  ...TT,
  contentStyle: {
    ...TT.contentStyle,
    fontSize: 17,
    padding: "16px 20px",
    borderRadius: 10,
  },
  itemStyle:  { ...TT.itemStyle,  fontSize: 17 },
  labelStyle: { ...TT.labelStyle, fontSize: 16 },
};

// Recharts axis tick - Analytics-scale (15-16px is the floor for legibility).
const ANALYTICS_TICK = { fill: C.textDim, fontSize: 15, fontFamily: FONT.ui, fontWeight: 500 };

// Vitamin or mineral card. Clicking it opens the drill-down panel, and a small "Sources ->" pill hints at that.
function NutrientCard({ active, label, note, onToggle, children }) {
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${label} — ${active ? "hide" : "show"} source breakdown`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      style={{
        background: active ? C.surface2 : C.surface,
        borderRadius: R.cardSm,
        padding: "16px 20px",
        cursor: "pointer",
        border: `1px solid ${active ? STATUS.info : "transparent"}`,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <span style={{ ...TYPE.analyticsLabel, color: C.text }}>
          {label}
        </span>
        <span style={{
          ...TYPE.analyticsControl,
          fontSize: 15,
          color: active ? C.bg : STATUS.ok,
          background: active ? STATUS.ok : "transparent",
          border: `1px solid ${STATUS.ok}66`,
          padding: "6px 12px",
          borderRadius: R.pill,
          whiteSpace: "nowrap",
          fontFamily: FONT.ui,
        }}>
          {active ? "Hide" : "Source Breakdown"}
        </span>
      </div>
      <div style={{ ...TYPE.analyticsMeta, color: C.text }}>{children}</div>
      {note && (
        <div style={{ ...TYPE.analyticsMeta, marginTop: 10, color: C.textDim }}>
          {note}
        </div>
      )}
    </div>
  );
}

function AminoPage({ view, enabledFoods, viewMode, userStats }) {
  const [selected, setSelected] = useState(null);
  const wKg = (userStats?.weightLb || 165) * 0.453592;

  const sources = useMemo(() => {
    if (!selected) return [];
    return enabledFoods
      .map((f) => {
        const g = getWeightInGrams(f);
        if (!g) return null;
        const gp = g / (viewMode === "daily" ? 7 : 1);
        const raw = selected === "taurine"
          ? getTaurinePer100g(f.nutrition_per_100g)
          : (f.nutrition_per_100g.amino_acids?.[selected] || 0);
        const val = (raw * gp) / 100;
        return { name: f.name, val: parseFloat(val.toFixed(3)), cat: f.category };
      })
      .filter((x) => x && x.val > 0)
      .sort((a, b) => b.val - a.val);
  }, [selected, enabledFoods, viewMode]);

  const sourceTotal = sources.reduce((s, x) => s + x.val, 0);

  const aminoColor = (p) =>
    p < 50 ? C.red : p < 80 ? C.orange : p > 300 ? C.purple : p > 200 ? C.orange : C.accent;

  return (
    <div>
      {selected && (
        <div style={{ background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: 12, padding: 22, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ ...TYPE.analyticsTitle, color: C.accent, textTransform: "capitalize" }}>
              {selected.replace(/_/g, " ")} — Food Sources ({viewMode === "daily" ? "daily equivalent" : "weekly input"})
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 22 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sources.map((s) => (
              <div key={s.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CategoryDot category={s.cat} size={10} />
                    <span style={{ ...TYPE.analyticsLabel, fontSize: 17, color: C.text }}>{s.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ ...TYPE.analyticsValue, color: C.teal }}>{s.val.toFixed(2)}g</span>
                    <span style={{ ...TYPE.analyticsValue, color: C.textDim, width: 64, textAlign: "right" }}>
                      {sourceTotal > 0 ? Math.round((s.val / sourceTotal) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div style={{ height: 6, background: C.surface, borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${sourceTotal > 0 ? (s.val / sourceTotal) * 100 : 0}%`, background: CATEGORY_COLORS[s.cat] || C.teal, borderRadius: 3 }} />
                </div>
              </div>
            ))}
            {sources.length === 0 && (
              <EmptyState
                title="No sources in current foods"
                hint="Enabled foods do not contribute this amino acid for the selected period."
              />
            )}
          </div>
          <div style={{ ...TYPE.analyticsValue, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, color: C.accentDim }}>
            Total ({viewMode}): {sourceTotal.toFixed(2)}g
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {Object.entries(AMINO_GROUPS).map(([groupName, group]) => (
          <div key={groupName} style={{ background: C.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${group.color}30` }}>
            <div style={{ background: group.color + "20", padding: "18px 24px", borderBottom: `1px solid ${group.color}30` }}>
              <div style={{ ...TYPE.analyticsTitle, color: group.color }}>{groupName}</div>
              <div style={{ ...TYPE.analyticsMeta, color: C.textDim, marginTop: 6 }}>{group.note}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 0 }}>
              {Object.entries(group.aminos).map(([aa, meta]) => {
                const val = view.amino_acids[aa] || 0;
                const rdaG = meta.rda_mg_per_kg > 0 ? (meta.rda_mg_per_kg * wKg) / 1000 : null;
                const p = rdaG ? Math.round((val / rdaG) * 100) : null;
                const c = rdaG ? aminoColor(p) : C.accent;
                const isSelected = selected === aa;
                return (
                  <div
                    key={aa}
                    onClick={() => setSelected(isSelected ? null : aa)}
                    style={{ padding: "20px 24px", cursor: "pointer", background: isSelected ? group.color + "20" : "transparent", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, transition: "background 0.15s" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ ...TYPE.analyticsLabel, color: isSelected ? group.color : C.text, textTransform: "capitalize" }}>
                          {aa.replace(/_/g, " ")}
                        </div>
                        <div style={{ ...TYPE.analyticsMeta, color: C.textDim, marginTop: 4, marginBottom: 14 }}>{meta.fn}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ ...TYPE.analyticsValue, color: c }}>{val.toFixed(2)}g</div>
                        {rdaG
                          ? <div style={{ ...TYPE.analyticsMeta, color: c, fontWeight: 650 }}>{p}% RDA</div>
                          : <div style={{ ...TYPE.analyticsMeta, color: C.textFaint }}>no RDA set</div>}
                      </div>
                    </div>
                    {rdaG && (
                      <div style={{ height: 8, background: C.surface2, borderRadius: 4 }}>
                        <div style={{ height: "100%", width: `${Math.min(p, 100)}%`, background: c, borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <span style={{
                        ...TYPE.analyticsControl,
                        fontSize: 15,
                        color: isSelected ? C.bg : group.color,
                        background: isSelected ? group.color : "transparent",
                        border: `1px solid ${group.color}66`,
                        padding: "5px 12px",
                        borderRadius: R.pill,
                        whiteSpace: "nowrap",
                      }}>
                        {isSelected ? "Hide" : "Food Sources"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics page with six tabs: Macros, Fats, Vitamins, Minerals, Amino, Special (creatine/taurine).
// Type is scaled up about 1.6x so it does not get lost next to the wide charts.
export default function AnalyticsPage({
  enabledFoods, view, totals, viewMode, setViewMode,
  activeCalcTab, setActiveCalcTab,
  drillNutrient, setDrillNutrient,
  calTarget, protTarget, userStats,
}) {
  const TAB_META = {
    macros:           { label: "Macros",   desc: "Calories, protein, fat, carbs, omega ratios" },
    fats:             { label: "Fats",     desc: "Fat type breakdown and linoleic acid sources" },
    micros:           { label: "Vitamins", desc: "All vitamins vs RDA — select any to view source breakdown" },
    minerals:         { label: "Minerals", desc: "All minerals vs RDA and key mineral ratios" },
    amino:            { label: "Amino",    desc: "Full amino acid profile spectrum" },
    creatine_taurine: { label: "Compounds", desc: "Informational bioactives and compounds by food source" },
    food_inspector:   { label: "Food Inspector",     desc: "Single-food daily nutrient contribution from current weekly quantity" },
  };
  const tabs = Object.keys(TAB_META);
  const protCal = view.protein * 4;
  const fatCal = view.fat * 9;
  const carbCal = view.carbs * 4;
  const totalMacroCal = protCal + fatCal + carbCal || 1;
  const macroData = [
    { name: "Protein", pct: parseFloat(((protCal / totalMacroCal) * 100).toFixed(1)), grams: view.protein.toFixed(1), color: C.teal },
    { name: "Fat", pct: parseFloat(((fatCal / totalMacroCal) * 100).toFixed(1)), grams: view.fat.toFixed(1), color: C.orange },
    { name: "Carbs", pct: parseFloat(((carbCal / totalMacroCal) * 100).toFixed(1)), grams: view.carbs.toFixed(1), color: C.accentDim },
  ];

  const ironAbsorbedPerDay = useMemo(() => {
    let heme = 0, nonheme = 0;
    enabledFoods.forEach((f) => {
      const g = getWeightInGrams(f);
      if (!g) return;
      const gp = g / (viewMode === "daily" ? 7 : 1);
      const ironVal = ((f.nutrition_per_100g.minerals?.iron || 0) * gp) / 100;
      if (["meat", "seafood"].includes(f.category)) {
        heme += ironVal * 0.4 * 0.25;
        nonheme += ironVal * 0.6 * 0.08;
      } else {
        nonheme += ironVal * 0.08;
      }
    });
    return (heme + nonheme).toFixed(2);
  }, [enabledFoods, viewMode]);

  const linoleicSources = useMemo(() => enabledFoods
    .map((f) => {
      const g = getWeightInGrams(f);
      if (!g) return null;
      const gp = g / (viewMode === "daily" ? 7 : 1);
      const val = ((f.nutrition_per_100g.fats?.linoleic || 0) * gp) / 100;
      return { name: f.name, val, cat: f.category };
    })
    .filter((x) => x && x.val > 0.01)
    .sort((a, b) => b.val - a.val)
    .slice(0, 6), [enabledFoods, viewMode]);

  const exportAnalyticsNumbers = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const cleanForJson = (value) => JSON.parse(JSON.stringify(value, (key, val) => {
      if (typeof val === "number" && !Number.isFinite(val)) return null;
      if (val === undefined) return null;
      return val;
    }));
    const readableName = (food) => food.name || food.label || food.title || food.id;
    const labelize = (key) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
    const percentTarget = (amount, target) => target ? Math.round((amount / target) * 100) : null;
    const targetStatus = (percent) => {
      if (percent == null) return null;
      if (percent < 50) return "low";
      if (percent < 80) return "under";
      if (percent > 300) return "very_high";
      if (percent > 200) return "high";
      return "ok";
    };
    const nutrientRow = (group, key, meta) => {
      const amountDaily = totals?.daily?.[group]?.[key] ?? 0;
      const amountWeekly = totals?.weekly?.[group]?.[key] ?? 0;
      const target = meta.rda ?? null;
      const percent = percentTarget(amountDaily, target);
      return {
        key,
        name: meta.label || labelize(key),
        group,
        amount_daily: amountDaily,
        amount_weekly: amountWeekly,
        unit: meta.unit ?? null,
        target,
        percent_target: percent,
        status: targetStatus(percent),
      };
    };
    const aminoGroupLookup = Object.fromEntries(
      Object.entries(AMINO_GROUPS).flatMap(([groupName, group]) =>
        Object.keys(group.aminos).map((key) => [key, groupName]),
      ),
    );
    const wKg = (userStats?.weightLb || 165) * 0.453592;
    const aminoRows = AMINO_KEYS.map((key) => {
      const groupName = aminoGroupLookup[key] ?? "Other";
      const meta = AMINO_GROUPS[groupName]?.aminos?.[key] ?? {};
      const target = meta.rda_mg_per_kg > 0 ? (meta.rda_mg_per_kg * wKg) / 1000 : null;
      const amountDaily = totals?.daily?.amino_acids?.[key] ?? 0;
      const amountWeekly = totals?.weekly?.amino_acids?.[key] ?? 0;
      const percent = percentTarget(amountDaily, target);
      return {
        key,
        name: labelize(key),
        group: groupName,
        amount_daily: amountDaily,
        amount_weekly: amountWeekly,
        unit: "g",
        target,
        percent_target: percent,
        status: targetStatus(percent),
      };
    });
    const categoryMap = new Map();
    enabledFoods.forEach((food) => {
      const grams = getWeightInGrams(food);
      if (grams === null) return;
      const mult = grams / 100;
      const n = food.nutrition_per_100g ?? {};
      const key = food.category || "uncategorized";
      const row = categoryMap.get(key) ?? {
        category: key,
        name: labelize(key),
        weekly: { calories: 0, protein: 0, fat: 0, carbs: 0, cost: 0 },
        daily: { calories: 0, protein: 0, fat: 0, carbs: 0, cost: 0 },
        percent_calories: 0,
        percent_cost: 0,
      };
      row.weekly.calories += (n.calories || 0) * mult;
      row.weekly.protein += (n.protein || 0) * mult;
      row.weekly.fat += (n.fat || 0) * mult;
      row.weekly.carbs += (n.carbs || 0) * mult;
      row.weekly.cost += (food.price_per_unit || 0) * (food.weekly_amount || 0);
      categoryMap.set(key, row);
    });
    const categories = Array.from(categoryMap.values())
      .map((row) => ({
        ...row,
        daily: {
          calories: row.weekly.calories / 7,
          protein: row.weekly.protein / 7,
          fat: row.weekly.fat / 7,
          carbs: row.weekly.carbs / 7,
          cost: row.weekly.cost / 7,
        },
        percent_calories: totals?.weekly?.calories ? parseFloat(((row.weekly.calories / totals.weekly.calories) * 100).toFixed(1)) : 0,
        percent_cost: totals?.weekly?.cost ? parseFloat(((row.weekly.cost / totals.weekly.cost) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.weekly.calories - a.weekly.calories);
    const fatPieData = [
      { name: "Saturated", value: parseFloat((view.fats?.saturated || 0).toFixed(2)), fill: C.orange },
      { name: "Mono", value: parseFloat((view.fats?.monounsaturated || 0).toFixed(2)), fill: C.accent },
      { name: "Poly", value: parseFloat((view.fats?.polyunsaturated || 0).toFixed(2)), fill: C.teal },
      { name: "Trans", value: parseFloat((view.fats?.trans || 0).toFixed(2)), fill: C.red },
    ].filter((d) => d.value > 0);
    const fattyAcids = [...new Set(Object.values(FATTY_ACID_KEYS))].map((key) => ({
      key,
      name: NUTRIENT_META.fats[key]?.label || labelize(key),
      group: "fatty_acids",
      amount_daily: totals?.daily?.fatty_acids?.[key] ?? totals?.daily?.fats?.[key] ?? 0,
      amount_weekly: totals?.weekly?.fatty_acids?.[key] ?? totals?.weekly?.fats?.[key] ?? 0,
      amount_current_view: view.fatty_acids?.[key] ?? view.fats?.[key] ?? 0,
      unit: NUTRIENT_META.fats[key]?.unit || "g",
    }));
    const mineralRatios = [
      { key: "calcium_phosphorus", name: "Ca:P", a: totals?.daily?.minerals?.calcium, b: totals?.daily?.minerals?.phosphorus, target: "1:1 to 2:1" },
      { key: "sodium_potassium", name: "Na:K", a: totals?.daily?.minerals?.sodium, b: totals?.daily?.minerals?.potassium, target: "<1 (K dom.)" },
      { key: "calcium_magnesium", name: "Ca:Mg", a: totals?.daily?.minerals?.calcium, b: totals?.daily?.minerals?.magnesium, target: "2:1" },
      { key: "iron_copper", name: "Fe:Cu", a: totals?.daily?.minerals?.iron, b: totals?.daily?.minerals?.copper, target: "10:1" },
    ].map((r) => ({
      key: r.key,
      name: r.name,
      group: "other",
      amount_daily: r.b > 0 ? r.a / r.b : null,
      amount_weekly: null,
      unit: "ratio",
      target: r.target,
      percent_target: null,
      status: null,
    }));
    const compoundConfig = [
      { key: "creatine", name: "Creatine", unit: "g", display_unit: "g", display_multiplier: 1 },
      { key: "taurine", name: "Taurine", unit: "g", display_unit: "mg", display_multiplier: 1000 },
      ...COMPOUND_KEYS.filter((key) => key !== "creatine").map((key) => ({
        key,
        name: NUTRIENT_META.compounds?.[key]?.label || labelize(key),
        unit: NUTRIENT_META.compounds?.[key]?.unit || (key === "cholesterol" ? "mg" : "g"),
        display_unit: NUTRIENT_META.compounds?.[key]?.unit || (key === "cholesterol" ? "mg" : "g"),
        display_multiplier: 1,
      })),
    ];
    const compounds = Object.fromEntries(compoundConfig.map((item) => {
      const daily = totals?.daily?.[item.key] ?? totals?.daily?.compounds?.[item.key] ?? 0;
      const weekly = totals?.weekly?.[item.key] ?? totals?.weekly?.compounds?.[item.key] ?? 0;
      return [item.key, {
        name: item.name,
        amount_daily: daily,
        amount_weekly: weekly,
        unit: item.unit,
        display_amount_daily: daily * item.display_multiplier,
        display_amount_weekly: weekly * item.display_multiplier,
        display_unit: item.display_unit,
      }];
    }));
    const exportObject = {
      _type: "analytics_full",
      exported_at: now.toISOString(),
      view_mode: viewMode,
      daily_totals: totals?.daily ?? {},
      weekly_totals: totals?.weekly ?? {},
      foods: enabledFoods.map((f) => ({
        id: f.id,
        name: readableName(f),
        category: f.category,
        weekly_amount: f.weekly_amount,
        unit: UNIT_LABELS[f.unit] || f.unit,
        price_per_unit: f.price_per_unit,
        enabled: f.enabled,
      })),
      categories,
      macros: {
        current_view: {
          calories: view.calories,
          protein: view.protein,
          fat: view.fat,
          carbs: view.carbs,
          omega3: view.omega3,
          omega6: view.omega6,
          cost: view.cost,
        },
        calorie_distribution: macroData,
        omega6_to_omega3_ratio: view.omega3 > 0 ? view.omega6 / view.omega3 : null,
      },
      fat_distribution: {
        current_view_total_fat: view.fat,
        current_view_fats: view.fats ?? {},
        rows: Object.entries(NUTRIENT_META.fats).map(([key, meta]) => {
          const amount = view.fats?.[key] || 0;
          return {
            key,
            name: meta.label,
            amount_current_view: amount,
            amount_daily: totals?.daily?.fats?.[key] ?? 0,
            amount_weekly: totals?.weekly?.fats?.[key] ?? 0,
            unit: meta.unit,
            percent_of_fat: view.fat ? Math.round((amount / view.fat) * 100) : 0,
          };
        }),
        pie_data: fatPieData,
        linoleic_sources: linoleicSources,
        omega6_to_omega3_ratio: view.omega3 > 0 ? view.omega6 / view.omega3 : null,
      },
      micronutrients: {
        vitamins: Object.entries(NUTRIENT_META.vitamins).map(([key, meta]) => nutrientRow("vitamins", key, meta)),
        minerals: Object.entries(NUTRIENT_META.minerals).map(([key, meta]) => nutrientRow("minerals", key, meta)),
        other: [
          ...mineralRatios,
          {
            key: "iron_absorbed_estimate",
            name: "Estimated absorbed iron",
            group: "other",
            amount_daily: Number(ironAbsorbedPerDay),
            amount_weekly: Number(ironAbsorbedPerDay) * 7,
            unit: "mg",
            target: null,
            percent_target: null,
            status: null,
          },
        ],
      },
      amino_acids: aminoRows,
      fatty_acids: fattyAcids,
      compounds,
      targets: {
        calories: {
          target_daily: calTarget,
          target_weekly: calTarget ? calTarget * 7 : null,
          amount_current_view: view.calories,
          percent_current_view: percentTarget(view.calories, calTarget),
          status_current_view: targetStatus(percentTarget(view.calories, calTarget)),
        },
        protein: {
          target_daily: protTarget,
          target_weekly: protTarget ? protTarget * 7 : null,
          amount_current_view: view.protein,
          percent_current_view: percentTarget(view.protein, protTarget),
          status_current_view: targetStatus(percentTarget(view.protein, protTarget)),
        },
        omega3: {
          target_daily: 2,
          target_weekly: 14,
          amount_current_view: view.omega3,
          percent_current_view: percentTarget(view.omega3, 2),
          status_current_view: targetStatus(percentTarget(view.omega3, 2)),
        },
        user_stats: userStats,
        micronutrient_targets: {
          vitamins: Object.fromEntries(Object.entries(NUTRIENT_META.vitamins).map(([key, meta]) => [key, { target: meta.rda, unit: meta.unit }])),
          minerals: Object.fromEntries(Object.entries(NUTRIENT_META.minerals).map(([key, meta]) => [key, { target: meta.rda, unit: meta.unit }])),
        },
        amino_acid_targets: Object.fromEntries(aminoRows.map((row) => [row.key, { target: row.target, unit: row.unit, group: row.group }])),
      },
      warnings: [],
    };

    const blob = new Blob([JSON.stringify(cleanForJson(exportObject), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_full_${datePart}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  // Sub-tab pill, same style as FilterChip so it matches the Food DB filter row.
  const tabBtnStyle = (active) => ({
    ...TYPE.analyticsControl,
    background: active ? STATUS.ok + "18" : "transparent",
    color: active ? STATUS.ok : C.textDim,
    border: `1px solid ${active ? STATUS.ok + "66" : C.border}`,
    borderRadius: R.btnSm,
    padding: "10px 16px",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <PageShell>
    <div style={{ fontFamily: FONT.ui }}>
      {/* Action bar - sub-tabs left, daily/weekly toggle right */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        padding: 12,
        alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setActiveCalcTab(t)} style={tabBtnStyle(activeCalcTab === t)}>
              {TAB_META[t].label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <SegmentedToggle
            size="sm"
            value={viewMode}
            onChange={setViewMode}
            options={[{ value: "daily", label: "Daily Eq." }, { value: "weekly", label: "Weekly Input" }]}
          />
        </div>
        <button onClick={exportAnalyticsNumbers} style={{ ...BTN.secondary(), padding: "9px 14px" }}>
          Export
        </button>
      </div>
      <div style={{ ...TYPE.analyticsMeta, marginBottom: 24 }}>{TAB_META[activeCalcTab]?.desc}</div>

      {activeCalcTab === "macros" && (
        <div className="grid-2-col">
          <div style={{ background: C.surface, borderRadius: 14, padding: 26, border: `1px solid ${C.border}` }}>
            <div style={{ ...TYPE.analyticsTitle, marginBottom: 22 }}>
              Macronutrient Totals ({Math.floor(userStats.heightIn / 12)}'{userStats.heightIn % 12}" / {userStats.weightLb}lb {userStats.sex})
            </div>
            {[
              { l: "Calories",      v: view.calories, rda: calTarget,   unit: "kcal", dec: 0, showPct: true },
              { l: "Protein",       v: view.protein,  rda: protTarget,  unit: "g",    dec: 1, showPct: true },
              { l: "Fat",           v: view.fat,       rda: null,        unit: "g",    dec: 1, showPct: false },
              { l: "Carbohydrates", v: view.carbs,     rda: null,        unit: "g",    dec: 1, showPct: false },
              { l: "Omega-3",       v: view.omega3,    rda: 2,           unit: "g",    dec: 2, showPct: true },
              { l: "Omega-6",       v: view.omega6,    rda: null,        unit: "g",    dec: 2, showPct: false },
            ].map((m) =>
              m.showPct ? (
                <div key={m.l} style={{ marginBottom: 16 }}>
                  <NutrientBar label={m.l} value={m.v} rda={m.rda} unit={m.unit} decimals={m.dec} />
                </div>
              ) : (
                <div key={m.l} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ ...TYPE.analyticsLabel, color: C.textDim }}>{m.l}</span>
                    <span style={{ ...TYPE.analyticsValue, color: C.textDim }}>{m.v.toFixed(m.dec)}{m.unit}</span>
                  </div>
                  <div style={{ height: 10, background: C.surface2, borderRadius: 5 }} />
                </div>
              ),
            )}
            <div style={{ marginTop: 22, padding: 20, background: C.bg, borderRadius: 10 }}>
              <div style={{ ...TYPE.analyticsLabel, color: C.textDim }}>Omega-6 : Omega-3 Ratio</div>
              <div style={{ ...TYPE.analyticsBigValue, color: view.omega6 > 0 ? (view.omega3 / view.omega6 > 0.4 ? C.accent : C.red) : C.textDim, marginTop: 6 }}>
                {view.omega6 > 0 ? (view.omega3 > 0 ? (view.omega6 / view.omega3).toFixed(1) : "∞") : "—"} : 1
              </div>
              <div style={{ ...TYPE.analyticsMeta, marginTop: 6 }}>Omega-6 per Omega-3 — target ≤4:1</div>
            </div>
          </div>
          <div style={{ background: C.surface, borderRadius: 14, padding: 26, border: `1px solid ${C.border}` }}>
            <div style={{ ...TYPE.analyticsTitle, marginBottom: 18 }}>Calorie Distribution</div>
            <MacroStackedBar macroData={macroData} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 22 }}>
              {macroData.map((m) => (
                <div key={m.name} style={{ background: C.bg, borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: m.color }} />
                    <span style={{ ...TYPE.analyticsLabel, fontSize: 16, color: C.textDim }}>{m.name}</span>
                  </div>
                  <div style={{ ...TYPE.analyticsBigValue, fontSize: 30, color: m.color }}>{m.pct}%</div>
                  <div style={{ ...TYPE.analyticsValue, fontSize: 17, color: C.textFaint, marginTop: 4 }}>{m.grams}g</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeCalcTab === "fats" && (
        <div className="grid-2-col">
          <div style={{ background: C.surface, borderRadius: 14, padding: 26 }}>
            <div style={{ ...TYPE.analyticsTitle, marginBottom: 18 }}>Fat Breakdown</div>
            {Object.entries(NUTRIENT_META.fats).map(([k, meta]) => {
              const val = view.fats?.[k] || 0;
              const pctOfFat = Math.round((val / (view.fat || 1)) * 100);
              const barColor = k === "trans" ? C.red : k === "saturated" ? C.orange : k === "linoleic" ? C.gold : k === "monounsaturated" ? C.accent : C.teal;
              return (
                <div key={k} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ ...TYPE.analyticsLabel, color: C.textDim }}>{meta.label}</span>
                    <span style={{ ...TYPE.analyticsValue, color: barColor }}>
                      {val.toFixed(2)}{meta.unit}
                      <span style={{ ...TYPE.analyticsMeta, color: C.textDim, marginLeft: 8 }}>({pctOfFat}% of fat)</span>
                    </span>
                  </div>
                  <div style={{ height: 12, background: C.surface2, borderRadius: 6 }}>
                    <div style={{ height: "100%", width: `${Math.min(pctOfFat, 100)}%`, background: barColor, borderRadius: 6 }} />
                  </div>
                  {k === "trans" && val > 0 && (
                    <div style={{ ...TYPE.analyticsMeta, color: C.textDim, marginTop: 6 }}>Natural ruminant trans fats (CLA/vaccenic) — considered beneficial</div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: C.surface, borderRadius: 14, padding: 26 }}>
              <div style={{ ...TYPE.analyticsTitle, marginBottom: 16 }}>Fat Type Distribution</div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Saturated", value: parseFloat((view.fats?.saturated || 0).toFixed(2)),      fill: C.orange },
                      { name: "Mono",      value: parseFloat((view.fats?.monounsaturated || 0).toFixed(2)), fill: C.accent },
                      { name: "Poly",      value: parseFloat((view.fats?.polyunsaturated || 0).toFixed(2)), fill: C.teal },
                      { name: "Trans",     value: parseFloat((view.fats?.trans || 0).toFixed(2)),            fill: C.red },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={130} innerRadius={46}
                    dataKey="value" cursor={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                      const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + r * Math.cos((-midAngle * Math.PI) / 180);
                      const y = cy + r * Math.sin((-midAngle * Math.PI) / 180);
                      return percent > 0.07 ? (
                        <text x={x} y={y} fill={C.text} textAnchor="middle" dominantBaseline="central" fontSize={17} fontWeight={700} fontFamily={FONT.num}>
                          <tspan x={x} dy="-9">{name}</tspan>
                          <tspan x={x} dy="22">{(percent * 100).toFixed(0)}%</tspan>
                        </text>
                      ) : null;
                    }}
                    labelLine={false}
                  />
                  <Tooltip {...TT_BIG} formatter={(v, n) => [`${v}g`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.surface, borderRadius: 14, padding: 26 }}>
              <div style={{ ...TYPE.analyticsTitle, marginBottom: 18 }}>Top Linoleic Acid Sources</div>
              {linoleicSources.length === 0 ? (
                <EmptyState
                  title="No linoleic sources"
                  hint="Enabled foods do not contribute measurable linoleic acid for this period."
                />
              ) : (
                linoleicSources.map((s) => (
                  <div key={s.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                      <span style={{ ...TYPE.analyticsLabel, fontSize: 17, color: C.textDim }}>{s.name}</span>
                      <span style={{ ...TYPE.analyticsValue, color: C.gold }}>{s.val.toFixed(2)}g</span>
                    </div>
                    <div style={{ height: 9, background: C.surface2, borderRadius: 5 }}>
                      <div style={{ height: "100%", width: `${Math.min((s.val / 5) * 100, 100)}%`, background: CATEGORY_COLORS[s.cat] || C.gold, borderRadius: 5 }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeCalcTab === "micros" && (
        <div>
          {drillNutrient?.type === "vit" && (
            <NutrientDrillDown nutrient={drillNutrient} type="vit" onClose={() => setDrillNutrient(null)} viewMode={viewMode} enabledFoods={enabledFoods} />
          )}
          <div className="grid-2-col">
            {Object.entries(NUTRIENT_META.vitamins).map(([k, meta]) => {
              const isActive = drillNutrient?.key === k;
              const note = k === "a"
                ? "preformed retinol only — beta-carotene excluded"
                : k === "d"
                ? "D3 only — D2 from plant/fungal sources excluded"
                : null;
              return (
                <NutrientCard
                  key={k}
                  active={isActive}
                  label={meta.label}
                  note={note}
                  onToggle={() => setDrillNutrient(isActive ? null : { key: k, type: "vit", label: meta.label, unit: meta.unit, rda: meta.rda })}
                >
                  <NutrientBar label="" value={view.vitamins[k]} rda={meta.rda} unit={meta.unit} />
                </NutrientCard>
              );
            })}
          </div>
        </div>
      )}

      {activeCalcTab === "minerals" && (
        <div>
          {drillNutrient?.type === "min" && (
            <NutrientDrillDown nutrient={drillNutrient} type="min" onClose={() => setDrillNutrient(null)} viewMode={viewMode} enabledFoods={enabledFoods} />
          )}
          <div className="grid-2-col" style={{ marginBottom: 24 }}>
            {Object.entries(NUTRIENT_META.minerals).map(([k, meta]) => {
              const isActive = drillNutrient?.key === k;
              const note = k === "iron"
                ? `est. absorbed ~${ironAbsorbedPerDay}mg (${viewMode}) — heme 25% + non-heme 8%`
                : null;
              return (
                <NutrientCard
                  key={k}
                  active={isActive}
                  label={meta.label}
                  note={note}
                  onToggle={() => setDrillNutrient(isActive ? null : { key: k, type: "min", label: meta.label, unit: meta.unit, rda: meta.rda })}
                >
                  <NutrientBar label="" value={view.minerals[k]} rda={meta.rda} unit={meta.unit} />
                </NutrientCard>
              );
            })}
          </div>
          <div style={{ background: C.surface, borderRadius: 14, padding: 28 }}>
            <div style={{ ...TYPE.analyticsTitle, marginBottom: 20 }}>Key Mineral Ratios</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
              {[
                { name: "Ca:P",  a: view.minerals.calcium,   b: view.minerals.phosphorus, target: "1:1 to 2:1" },
                { name: "Na:K",  a: view.minerals.sodium,    b: view.minerals.potassium,  target: "<1 (K dom.)" },
                { name: "Ca:Mg", a: view.minerals.calcium,   b: view.minerals.magnesium,  target: "2:1" },
                { name: "Fe:Cu", a: view.minerals.iron,      b: view.minerals.copper,     target: "10:1" },
              ].map((r) => (
                <div key={r.name} style={{ background: C.bg, borderRadius: 10, padding: 22, textAlign: "center" }}>
                  <div style={{ ...TYPE.analyticsLabel, color: C.textDim, fontWeight: 700 }}>{r.name}</div>
                  <div style={{ ...TYPE.analyticsBigValue, color: C.text, marginTop: 8 }}>{r.b > 0 ? (r.a / r.b).toFixed(2) : "—"}</div>
                  <div style={{ ...TYPE.analyticsMeta, marginTop: 6 }}>Target: {r.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeCalcTab === "amino" && (
        <AminoPage view={view} enabledFoods={enabledFoods} viewMode={viewMode} userStats={userStats} />
      )}

      {/* view.creatine and view.taurine come from computeTotals in grams. Creatine shows in g,
          taurine is multiplied by 1000 to show mg. Per-food values use the same per-100g math, so
          tooltip totals add up to the card number. */}
      {activeCalcTab === "creatine_taurine" && (
        <div>
          {drillNutrient?.type === "cmp" && (
            <NutrientDrillDown nutrient={drillNutrient} type="cmp" onClose={() => setDrillNutrient(null)} viewMode={viewMode} enabledFoods={enabledFoods} />
          )}
          <div className="grid-2-col" style={{ marginBottom: 24 }}>
            {Object.entries(NUTRIENT_META.compounds).map(([k, meta]) => {
              const isActive = drillNutrient?.type === "cmp" && drillNutrient?.key === k;
              return (
                <NutrientCard
                  key={k}
                  active={isActive}
                  label={meta.label}
                  onToggle={() => setDrillNutrient(isActive ? null : { key: k, type: "cmp", label: meta.label, unit: meta.unit, rda: meta.rda })}
                >
                  <NutrientBar label="" value={view.compounds?.[k] ?? 0} rda={meta.rda} unit={meta.unit} />
                </NutrientCard>
              );
            })}
          </div>
          <div className="grid-2-col">
            {[
            { label: "Creatine", key: "creatine", color: C.purple, unit: "g",  displayMult: 1,    decimals: 2, sources: ["meat", "seafood"] },
            { label: "Taurine",  key: "taurine",  color: C.teal,   unit: "mg", displayMult: 1000, decimals: 0, sources: ["seafood", "meat", "dairy_eggs"] },
            { label: "Cholesterol", key: "cholesterol", color: C.gold, unit: "mg", displayMult: 1, decimals: 0, sources: ["meat", "seafood", "dairy_eggs"] },
            { label: "Collagen Estimate", key: "collagen_estimate", color: C.orange, unit: "g", displayMult: 1, decimals: 1, sources: ["meat", "seafood"] },
            { label: "Beta-Carotene", key: "beta_carotene", color: C.orange, unit: "mg", displayMult: 1, decimals: 1, sources: ["meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"] },
            { label: "Alpha-Carotene", key: "alpha_carotene", color: C.gold, unit: "mg", displayMult: 1, decimals: 1, sources: ["meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"] },
            { label: "Lutein + Zeaxanthin", key: "lutein_zeaxanthin", color: C.teal, unit: "mg", displayMult: 1, decimals: 1, sources: ["meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"] },
          ].map((item) => {
            const val = (view[item.key] ?? view.compounds?.[item.key] ?? 0) * item.displayMult;

            const byFood = enabledFoods
              .filter((f) => item.sources.includes(f.category))
              .map((f) => {
                const g = getWeightInGrams(f);
                if (!g) return null;
                const gp = g / (viewMode === "daily" ? 7 : 1);
                const rawPer100 = item.key === "taurine"
                  ? getTaurinePer100g(f.nutrition_per_100g)
                  : item.key === "creatine"
                  ? getCreatinePer100g(f.nutrition_per_100g)
                  : item.key === "collagen_estimate"
                  ? (f.nutrition_per_100g.compounds?.collagen_estimate ?? (f.nutrition_per_100g.amino_acids?.hydroxyproline || 0) * 7.5)
                  : (f.nutrition_per_100g.compounds?.[item.key] ?? 0);
                const v = (rawPer100 * gp) / 100;
                const vDisplay = v * item.displayMult;
                return {
                  name: f.name,
                  value: parseFloat(vDisplay.toFixed(item.decimals + 1)),
                };
              })
              .filter((x) => x && x.value > 0)
              .sort((a, b) => b.value - a.value);

            return (
              <div key={item.key} style={{ background: C.surface, borderRadius: 14, padding: 28 }}>
                <div style={{ ...TYPE.analyticsTitle, marginBottom: 10 }}>
                  {item.label} ({viewMode})
                </div>
                <div style={{ ...TYPE.analyticsBigValue, fontSize: 56, color: item.color, marginBottom: 22, lineHeight: 1.05 }}>
                  {val.toFixed(item.decimals)}{item.unit}
                </div>
                {byFood.length === 0 ? (
                  <EmptyState
                    title={`No ${item.label.toLowerCase()} sources`}
                    hint="Enabled foods do not contribute measurable amounts for this period."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={byFood} margin={{ top: 10, right: 16, bottom: 10, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                      <XAxis dataKey="name" tick={ANALYTICS_TICK} angle={-30} textAnchor="end" height={86} interval={0} />
                      <YAxis tick={ANALYTICS_TICK} />
                      <Tooltip
                        contentStyle={TT_BIG.contentStyle}
                        itemStyle={TT_BIG.itemStyle}
                        labelStyle={TT_BIG.labelStyle}
                        wrapperStyle={TT_BIG.wrapperStyle}
                        cursor={TT_BIG.cursor}
                        formatter={(v) => [`${Number(v).toFixed(item.decimals)}${item.unit}`, item.label]}
                      />
                      <Bar dataKey="value" fill={item.color} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

      {activeCalcTab === "food_inspector" && (
        <FoodInspectorPage enabledFoods={enabledFoods} />
      )}
    </div>
    </PageShell>
  );
}

// Pick one enabled food and see its daily contribution to every nutrient (weekly amount -> grams -> /7).
// The view mode is ignored here, it is always per day.
function FoodInspectorPage({ enabledFoods }) {
  const [filter, setFilter] = useState("");
  const candidates = useMemo(() => enabledFoods.filter((f) => getWeightInGrams(f) !== null), [enabledFoods]);
  const [selectedId, setSelectedId] = useState(() => candidates[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((f) => f.name.toLowerCase().includes(q));
  }, [candidates, filter]);

  const selected = useMemo(
    () => candidates.find((f) => f.id === selectedId) || filtered[0] || null,
    [candidates, filtered, selectedId],
  );

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="No enabled foods to inspect"
        hint="Enable a food in the Database tab and give it a weight so its daily contribution can be computed."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.card, padding: 22 }}>
        <div style={{ ...TYPE.analyticsTitle, marginBottom: 14 }}>Select Food</div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search foods..."
          style={{
            width: "100%",
            background: C.bg,
            border: `1px solid ${C.border}`,
            color: C.text,
            padding: "12px 16px",
            borderRadius: R.input,
            ...TYPE.analyticsControl,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 14,
          }}
        />
        {filtered.length === 0 ? (
          <div style={{ ...TYPE.analyticsMeta, padding: "12px 4px" }}>
            No enabled foods match "{filter}".
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((f) => {
              const isActive = selected?.id === f.id;
              const catColor = CATEGORY_COLORS[f.category] || C.textDim;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isActive ? catColor + "22" : C.bg,
                    border: `1px solid ${isActive ? catColor : C.border}`,
                    borderRadius: R.btnSm,
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <CategoryDot category={f.category} size={9} />
                  <span style={{ ...TYPE.analyticsLabel, fontSize: 16, color: isActive ? catColor : C.text }}>{f.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && <FoodInspectorReadout food={selected} />}
    </div>
  );
}

function FoodInspectorReadout({ food }) {
  const weeklyGrams = getWeightInGrams(food) ?? 0;
  const dailyGrams = weeklyGrams / 7;
  const mult = dailyGrams / 100;
  const n = food.nutrition_per_100g ?? {};
  const catColor = CATEGORY_COLORS[food.category] || C.textDim;

  const dailyMacros = {
    calories: (n.calories || 0) * mult,
    protein:  (n.protein  || 0) * mult,
    fat:      (n.fat      || 0) * mult,
    carbs:    (n.carbs    || 0) * mult,
  };

  const unitLabel = UNIT_LABELS[food.unit] || food.unit;

  const vitaminRows = Object.entries(NUTRIENT_META.vitamins)
    .map(([k, meta]) => {
      const raw = n.vitamins?.[k] || 0;
      const value = raw * mult;
      const p = meta.rda ? pct(value, meta.rda) : null;
      return { k, label: meta.label, unit: meta.unit, rda: meta.rda, value, p };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => (b.p ?? -1) - (a.p ?? -1) || b.value - a.value);

  const mineralRows = Object.entries(NUTRIENT_META.minerals)
    .map(([k, meta]) => {
      const raw = n.minerals?.[k] || 0;
      const value = raw * mult;
      const p = meta.rda ? pct(value, meta.rda) : null;
      return { k, label: meta.label, unit: meta.unit, rda: meta.rda, value, p };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => (b.p ?? -1) - (a.p ?? -1) || b.value - a.value);

  const fatRows = Object.entries(NUTRIENT_META.fats)
    .map(([k, meta]) => ({
      k, label: meta.label, unit: meta.unit,
      value: (n.fats?.[k] || 0) * mult,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const aminoLabel = (k) => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");
  const aminoRows = AMINO_KEYS
    .map((k) => ({
      k,
      label: aminoLabel(k),
      unit: "g",
      value: (n.amino_acids?.[k] || 0) * mult,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const creatineDaily = getCreatinePer100g(n) * mult;       // g / day
  const taurineDaily  = getTaurinePer100g(n) * mult * 1000; // mg / day for readability
  const collagenDaily = (n.compounds?.collagen_estimate ?? (n.amino_acids?.hydroxyproline || 0) * 7.5) * mult;
  const specialRows = [
    { k: "creatine", label: "Creatine", unit: "g",  value: creatineDaily, decimals: 3 },
    { k: "taurine",  label: "Taurine",  unit: "mg", value: taurineDaily,  decimals: 0 },
    { k: "collagen_estimate", label: "Collagen Estimate", unit: "g", value: collagenDaily, decimals: 1 },
    ...Object.entries(NUTRIENT_META.compounds).map(([k, meta]) => ({
      k,
      label: meta.label,
      unit: meta.unit,
      value: (n.compounds?.[k] || 0) * mult,
      decimals: meta.unit === "mg" ? 1 : 2,
    })),
  ].filter((r) => r.value > 0);

  return (
    <>
      <div style={{ background: C.surface, border: `1px solid ${catColor}55`, borderRadius: R.card, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <CategoryDot category={food.category} size={12} />
          <div style={TYPE.analyticsTitle}>{food.name}</div>
        </div>
        {food.quality && (
          <div style={{ ...TYPE.analyticsMeta, color: C.textDim, marginBottom: 18 }}>{food.quality}</div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18, marginBottom: 18 }}>
          <InspectorStat label="Weekly Amount" value={`${food.weekly_amount.toFixed(2)} ${unitLabel}/wk`} color={C.text} />
          <InspectorStat label="Daily Grams"    value={`${dailyGrams.toFixed(1)} g/day`} color={C.text} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18 }}>
          <InspectorStat label="Calories / day" value={Math.round(dailyMacros.calories)}        color={STATUS.danger} />
          <InspectorStat label="Protein / day"  value={`${dailyMacros.protein.toFixed(1)}g`}    color={STATUS.info} />
          <InspectorStat label="Fat / day"      value={`${dailyMacros.fat.toFixed(1)}g`}        color={STATUS.warn} />
          <InspectorStat label="Carbs / day"    value={`${dailyMacros.carbs.toFixed(1)}g`}      color={C.textDim} />
        </div>
      </div>

      <div className="grid-2-col">
        <InspectorSection title="Vitamins — daily contribution" rows={vitaminRows} emptyText="No vitamin contribution from this food." />
        <InspectorSection title="Minerals — daily contribution" rows={mineralRows} emptyText="No mineral contribution from this food." />
      </div>
      <div className="grid-2-col">
        <InspectorSection title="Amino Acids — daily contribution" rows={aminoRows} emptyText="No amino acid data on this food." valueDecimals={2} />
        <InspectorSection title="Fats — daily contribution" rows={fatRows} emptyText="No fat-type breakdown on this food." valueDecimals={2} />
      </div>
      {specialRows.length > 0 && (
        <InspectorSection title="Compounds — daily contribution" rows={specialRows} emptyText="No compound data for this food." />
      )}
    </>
  );
}

function InspectorStat({ label, value, color }) {
  return (
    <div>
      <div style={{ ...TYPE.kpiLabel, marginBottom: 6 }}>{label}</div>
      <div style={{ ...TYPE.analyticsBigValue, fontSize: 28, color }}>{value}</div>
    </div>
  );
}

function InspectorSection({ title, rows, emptyText, valueDecimals }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: R.card, padding: 22 }}>
      <div style={{ ...TYPE.analyticsTitle, fontSize: 22, marginBottom: 14 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ ...TYPE.analyticsMeta, color: C.textFaint }}>{emptyText}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => {
            const decimals = r.decimals ?? valueDecimals ?? (r.unit === "g" ? 2 : r.unit === "mg" || r.unit === "μg" ? 1 : 1);
            const showBar = r.p != null && r.rda;
            return (
              <div key={r.k}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ ...TYPE.analyticsLabel, fontSize: 17, color: C.text }}>{r.label}</span>
                  <span style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                    <span style={{ ...TYPE.analyticsValue, color: C.text }}>
                      {r.value.toFixed(decimals)}{r.unit}
                    </span>
                    {showBar && (
                      <span style={{ ...TYPE.analyticsMeta, color: C.textDim, width: 64, textAlign: "right" }}>
                        {fmtPct(r.p)} RDA
                      </span>
                    )}
                  </span>
                </div>
                {showBar && (
                  <div style={{ height: 6, background: C.surface2, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(r.p, 100)}%`, background: STATUS.ok, borderRadius: 3 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
