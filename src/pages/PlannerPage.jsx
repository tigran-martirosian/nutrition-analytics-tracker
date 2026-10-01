import { useState, useMemo } from "react";
import { C, CATEGORY_COLORS, UNIT_LABELS, STATUS, SP, FONT, TYPE, R } from "../constants.js";
import { getWeightInGrams } from "../utils/nutrition.js";
import EditableCell from "../components/EditableCell.jsx";
import { PageShell, SegmentedToggle, CategoryHeader, EmptyState, WarningBadge } from "../components/ui.jsx";

// Editing page. The quantity input is the main thing in each row, and a sticky totals strip keeps macros and cost in view.
// The hide toggle filters by f.enabled, not by quantity.
export default function PlannerPage({ foods, updateFood, viewMode, setViewMode }) {
  const [hideInactive, setHideInactive] = useState(true);
  const [collapsed, setCollapsed] = useState(new Set());

  const visibleFoods = hideInactive ? foods.filter((f) => f.enabled) : foods;
  const isDaily = viewMode === "daily";

  const categories = ["meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"];
  const categoryNames = {
    meat: "Meat", seafood: "Seafood", dairy_eggs: "Dairy & Eggs",
    grain: "Grain", vegetable: "Vegetable", fruit: "Fruit", other: "Other",
  };

  // Per-food values are computed once so category subtotals and the footer agree.
  const computed = useMemo(() => visibleFoods.map((f) => {
    const grams = getWeightInGrams(f);
    const mult = grams !== null ? (isDaily ? grams / 7 : grams) / 100 : 0;
    const n = f.nutrition_per_100g;
    return {
      food: f,
      grams,
      calories: grams !== null ? n.calories * mult : 0,
      protein:  grams !== null ? n.protein  * mult : 0,
      fat:      grams !== null ? n.fat      * mult : 0,
      carbs:    grams !== null ? n.carbs    * mult : 0,
      cost:     f.price_per_unit * f.weekly_amount / (isDaily ? 7 : 1),
    };
  }), [visibleFoods, isDaily]);

  const totals = computed.reduce((acc, r) => ({
    calories: acc.calories + r.calories,
    protein:  acc.protein  + r.protein,
    fat:      acc.fat      + r.fat,
    carbs:    acc.carbs    + r.carbs,
    cost:     acc.cost     + r.cost,
  }), { calories: 0, protein: 0, fat: 0, carbs: 0, cost: 0 });

  const grouped = categories.map((cat) => ({
    cat,
    rows: computed.filter((r) => r.food.category === cat),
  })).filter((g) => g.rows.length > 0);

  const toggleCat = (cat) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const periodLabel = isDaily ? "day" : "wk";

  return (
    <PageShell>
      {/* Sticky live totals strip - pinned BELOW the top nav so they don't
          overlap. SP.stickyTop is the shared offset for any in-page sticky. */}
      <div style={{
        position: "sticky", top: SP.stickyTop, zIndex: 30,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        padding: "22px 28px",
        display: "grid",
        gridTemplateColumns: "auto repeat(4, minmax(0,1fr))",
        gap: 36,
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={TYPE.kpiLabel}>
            View
          </span>
          <SegmentedToggle
            size="sm"
            value={viewMode}
            onChange={setViewMode}
            options={[{ value: "daily", label: "Daily Eq." }, { value: "weekly", label: "Weekly Input" }]}
          />
        </div>
        <PlannerTotal label="Calories" value={Math.round(totals.calories)}            color={STATUS.danger} />
        <PlannerTotal label="Protein"  value={`${Math.round(totals.protein)}g`}        color={STATUS.info} />
        <PlannerTotal label="Fat"      value={`${Math.round(totals.fat)}g`}            color={STATUS.warn} />
        <PlannerTotal label={isDaily ? "Cost / day" : "Cost / wk"} value={`$${totals.cost.toFixed(2)}`} color={STATUS.ok} />
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 8,
          ...TYPE.control, color: C.textDim, cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            style={{ accentColor: STATUS.ok }}
          />
          Hide inactive
        </label>
        <span style={{ ...TYPE.rowMeta, marginLeft: "auto" }}>
          {visibleFoods.length} visible · {foods.filter((f) => f.enabled).length} active of {foods.length} total
        </span>
      </div>

      {grouped.map(({ cat, rows }) => {
        const isCollapsed = collapsed.has(cat);
        const catColor = CATEGORY_COLORS[cat] || C.textDim;
        const subtotals = rows.reduce((acc, r) => ({
          calories: acc.calories + r.calories,
          protein:  acc.protein  + r.protein,
          carbs:    acc.carbs    + r.carbs,
          cost:     acc.cost     + r.cost,
        }), { calories: 0, protein: 0, carbs: 0, cost: 0 });

        return (
          <div key={cat}>
            <CategoryHeader
              color={catColor}
              name={categoryNames[cat]}
              count={rows.length}
              collapsed={isCollapsed}
              onClick={() => toggleCat(cat)}
              subtotals={[
                { label: "kcal", value: Math.round(subtotals.calories), color: STATUS.danger },
                { label: "prot", value: `${Math.round(subtotals.protein)}g`, color: STATUS.info },
                { label: "carb", value: `${subtotals.carbs.toFixed(1)}g`, color: C.textDim },
                { label: "$",    value: subtotals.cost.toFixed(2), color: STATUS.ok },
              ]}
            />

            {!isCollapsed && (
              <div className="table-scroll" style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: R.card,
                overflow: "auto",
              }}>
                <table className="data-table">
                  <colgroup>
                    <col style={{ width: 280 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 104 }} />
                    <col style={{ width: 96 }} />
                    <col style={{ width: 98 }} />
                    <col style={{ width: 84 }} />
                    <col style={{ width: 88 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Food</th>
                      {/* Quantity is always weekly: the editable cell binds to
                          weekly_amount regardless of viewMode. The other numeric
                          columns (Calories/Protein/Fat/Cost) follow periodLabel. */}
                      <th className="num">Quantity / Week</th>
                      <th className="num">kcal / {periodLabel}</th>
                      <th className="num">protein / {periodLabel}</th>
                      <th className="num">fat / {periodLabel}</th>
                      <th className="num">carbs / {periodLabel}</th>
                      <th className="num">cost / {periodLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ food: f, grams, calories, protein, fat, carbs, cost }) => (
                      <tr
                        key={f.id}
                        className="row-interactive"
                        style={{ opacity: f.enabled ? 1 : 0.55 }}
                      >
                        <td>
                          <div style={TYPE.foodName}>{f.name}</div>
                          {f.quality && (
                            <div style={{ ...TYPE.rowMeta, marginTop: 3 }}>{f.quality}</div>
                          )}
                          {grams === null && (
                            <div style={{ marginTop: 6 }}>
                              <WarningBadge text="No item weight — excluded from totals" />
                            </div>
                          )}
                        </td>
                        <td className="num">
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <EditableCell
                              value={f.weekly_amount}
                              onChange={(v) => updateFood(f.id, "weekly_amount", parseFloat(v) || 0)}
                              type="number"
                              min={0}
                              step={0.1}
                              width={80}
                              align="right"
                              renderPreview={(draft) => <QuantityDeltaPreview food={f} draft={draft} />}
                            />
                            <span style={{ ...TYPE.rowMeta, color: C.textFaint }}>
                              {UNIT_LABELS[f.unit] || f.unit}/week
                            </span>
                          </div>
                        </td>
                        <td className="num" style={{ color: STATUS.danger }}>{Math.round(calories)}</td>
                        <td className="num" style={{ color: STATUS.info }}>{Math.round(protein)}g</td>
                        <td className="num" style={{ color: STATUS.warn }}>{Math.round(fat)}g</td>
                        <td className="num" style={{ color: C.textDim }}>{carbs.toFixed(1)}g</td>
                        <td className="num" style={{ color: STATUS.ok }}>${cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {visibleFoods.length === 0 && (
        <EmptyState title="No foods to display" hint="Toggle 'Hide inactive' off to see disabled items." />
      )}
    </PageShell>
  );
}

function dailyFromWeeklyAmount(food, weeklyAmount) {
  const amount = Number(weeklyAmount) || 0;
  const grams = getWeightInGrams({ ...food, weekly_amount: amount });
  if (grams === null) return { calories: 0, protein: 0, fat: 0, carbs: 0, cost: food.price_per_unit * amount };
  const mult = grams / 100 / 7;
  const n = food.nutrition_per_100g;
  return {
    calories: n.calories * mult,
    protein: n.protein * mult,
    fat: n.fat * mult,
    carbs: n.carbs * mult,
    cost: food.price_per_unit * amount,
  };
}

function QuantityDeltaPreview({ food, draft }) {
  const nextAmount = Number(draft);
  if (!Number.isFinite(nextAmount)) return null;
  const base = dailyFromWeeklyAmount(food, food.weekly_amount);
  const next = dailyFromWeeklyAmount(food, nextAmount);
  const delta = {
    calories: next.calories - base.calories,
    protein: next.protein - base.protein,
    fat: next.fat - base.fat,
    carbs: next.carbs - base.carbs,
    cost: next.cost - base.cost,
  };
  if (Object.values(delta).every((v) => Math.abs(v) < 0.005)) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, max-content)", columnGap: 8, rowGap: 2, color: C.textFaint, ...TYPE.sourceCode, fontSize: 10.5, textAlign: "right" }}>
      <span>Δ {fmtDelta(delta.calories, 0)} kcal/d</span>
      <span>{fmtDelta(delta.protein, 1)}g P/d</span>
      <span>{fmtDelta(delta.fat, 1)}g F/d</span>
      <span>{fmtDelta(delta.carbs, 1)}g C/d</span>
      <span style={{ gridColumn: "1 / -1", color: STATUS.ok }}>Δ ${fmtDelta(delta.cost, 2)}/wk</span>
    </div>
  );
}

function fmtDelta(value, decimals) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

function PlannerTotal({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={TYPE.kpiLabel}>
        {label}
      </span>
      <span style={{
        fontFamily: FONT.num,
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 1.05,
        letterSpacing: "-0.04em",
        fontVariantNumeric: "tabular-nums",
        color,
      }}>
        {value}
      </span>
    </div>
  );
}
