import { useMemo } from "react";
import { C, CATEGORY_COLORS, TYPE, R } from "../constants.js";
import { getWeightInGrams, vitD_toUg } from "../utils/nutrition.js";
import CategoryDot from "./CategoryDot.jsx";

// Panel listing which foods contribute to a nutrient.
// Props: nutrient, type (vit|min|cmp), onClose, viewMode, enabledFoods
export default function NutrientDrillDown({ nutrient, type, onClose, viewMode, enabledFoods }) {
  const sources = useMemo(() =>
    enabledFoods
      .map((f) => {
        const grams = getWeightInGrams(f);
        if (grams === null) return null;
        const gramsForPeriod = grams / (viewMode === "daily" ? 7 : 1);
        const mult = gramsForPeriod / 100;
        let raw = 0;
        if (type === "vit") raw = f.nutrition_per_100g.vitamins?.[nutrient.key] || 0;
        if (type === "min") raw = f.nutrition_per_100g.minerals?.[nutrient.key] || 0;
        if (type === "cmp") raw = f.nutrition_per_100g.compounds?.[nutrient.key] || 0;
        if (type === "vit" && nutrient.key === "d") raw = vitD_toUg(raw, f);
        return {
          name: f.name,
          value: parseFloat((raw * mult).toFixed(4)),
          category: f.category,
        };
      })
      .filter(Boolean)
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value),
    [enabledFoods, nutrient, type, viewMode],
  );
  const total = sources.reduce((s, f) => s + f.value, 0);
  const hasTarget = nutrient.rda != null && nutrient.rda > 0;
  return (
    <div style={{ background: C.bg, border: "1px solid " + C.borderHi, borderRadius: 10, padding: 22, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={TYPE.analyticsTitle}>
          {nutrient.label} — Source Breakdown <span style={{ ...TYPE.analyticsMeta, color: C.textFaint, marginLeft: 6 }}>({viewMode === "daily" ? "daily equivalent" : "weekly input"})</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, fontSize: 22, cursor: "pointer" }}>✕</button>
      </div>
      {sources.length === 0 && (
        <div style={{
          padding: "20px 14px",
          textAlign: "center",
          ...TYPE.analyticsMeta,
          background: C.surface,
          borderRadius: R.cardSm,
          border: `1px dashed ${C.border}`,
        }}>
          None of your enabled foods provide {nutrient.label.toLowerCase()}.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sources.map((s) => {
          const pctOfTotal = total > 0 ? (s.value / total) * 100 : 0;
          return (
            <div key={s.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CategoryDot category={s.category} size={9} />
                  <span style={{ ...TYPE.analyticsLabel, fontSize: 17, color: C.text }}>{s.name}</span>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                  <span style={{ ...TYPE.analyticsValue, color: C.teal }}>
                    {s.value.toFixed(3)}{nutrient.unit}
                  </span>
                  <span style={{ ...TYPE.analyticsValue, color: C.textDim, width: 56, textAlign: "right" }}>
                    {pctOfTotal.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div style={{ height: 6, background: C.surface, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${pctOfTotal}%`, background: CATEGORY_COLORS[s.category] || C.teal, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, borderTop: "1px solid " + C.border, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ ...TYPE.analyticsLabel, color: C.textDim, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 15 }}>Total</span>
        <span style={{ ...TYPE.analyticsValue, color: C.accentDim }}>
          {total.toFixed(3)}{nutrient.unit}{hasTarget ? ` - ${Math.round((total / nutrient.rda) * 100)}% RDA` : ""}
        </span>
      </div>
    </div>
  );
}
