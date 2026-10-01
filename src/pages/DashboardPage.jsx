import { C, STATUS, SP, FONT, TYPE, R, TT, WEEKS_PER_MONTH } from "../constants.js";
import { NUTRIENT_META } from "../data/nutrientMeta.js";
import { pct, fmtPct } from "../utils/nutrition.js";
import MacroStackedBar from "../components/MacroStackedBar.jsx";
import { MetricCard, ChartCard, PageShell, SectionHeader } from "../components/ui.jsx";

// Landing page: KPI row, then a 60/40 split of macro summary and key nutrients.
// eslint-disable-next-line no-unused-vars
export default function DashboardPage({ totals, calTarget, protTarget, userStats }) {
  const daily = totals.daily;
  const protCal = daily.protein * 4;
  const fatCal  = daily.fat * 9;
  const carbCal = daily.carbs * 4;
  const totalMacroCal = protCal + fatCal + carbCal || 1;

  const macroData = [
    { name: "Protein", pct: parseFloat(((protCal / totalMacroCal) * 100).toFixed(1)), grams: daily.protein.toFixed(1), color: STATUS.info },
    { name: "Fat",     pct: parseFloat(((fatCal  / totalMacroCal) * 100).toFixed(1)), grams: daily.fat.toFixed(1),     color: STATUS.warn },
    { name: "Carbs",   pct: parseFloat(((carbCal / totalMacroCal) * 100).toFixed(1)), grams: daily.carbs.toFixed(1),   color: STATUS.ok   },
  ];

  // Colors are semantic: status colors for calories and macros, warn for cost, excess/info for the mineral ratio.
  const calStatus  = daily.calories >= calTarget   ? STATUS.ok   : STATUS.warn;
  const protStatus = daily.protein  >= protTarget  ? STATUS.ok   : STATUS.warn;
  const znCu       = daily.minerals.copper > 0
    ? (daily.minerals.zinc / daily.minerals.copper)
    : null;
  const znCuStatus = znCu == null
    ? STATUS.muted
    : (znCu >= 8 && znCu <= 12) ? STATUS.ok
    : (znCu < 8) ? STATUS.warn
    : STATUS.excess;

  const kpiCards = [
    { label: "Daily Calories", value: `${Math.round(daily.calories)}`,   sub: `target ~${calTarget} kcal`,           color: calStatus,  accent: calStatus  },
    { label: "Daily Protein",  value: `${Math.round(daily.protein)}g`,    sub: `target ${protTarget}g (1g/lb)`,       color: protStatus, accent: protStatus },
    { label: "Weekly Cost",    value: `$${totals.weekly.cost.toFixed(2)}`, sub: `~$${(totals.weekly.cost * WEEKS_PER_MONTH).toFixed(0)}/mo projected`, color: STATUS.warn, accent: STATUS.warn },
    { label: "Zn : Cu",        value: znCu != null ? znCu.toFixed(1) : "—", sub: "target 8–12 : 1",                   color: znCuStatus, accent: znCuStatus },
  ];

  const dashNutrients = [
    { k: "d",         type: "vit", ...NUTRIENT_META.vitamins.d,         note: "☀ daily sun exposure tracked separately" },
    { k: "potassium", type: "min", ...NUTRIENT_META.minerals.potassium, note: null },
    { k: "sodium",    type: "min", ...NUTRIENT_META.minerals.sodium,    note: null },
    { k: "magnesium", type: "min", ...NUTRIENT_META.minerals.magnesium, note: null },
  ];

  return (
    <PageShell>
      <div className="grid-kpi-4">
        {kpiCards.map((k) => (
          <MetricCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid-2-col-wide-left">
        <ChartCard label="Daily macronutrients" sub="Calorie share & grams">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <span style={{ ...TYPE.kpiLabel, textTransform: "none", letterSpacing: 0 }}>Total</span>
            <span style={{ ...TYPE.kpiValue, fontSize: 32, color: calStatus }}>
              {Math.round(daily.calories)}
              <span style={{ ...TYPE.kpiSub, marginLeft: 6 }}>kcal</span>
            </span>
          </div>

          <MacroStackedBar macroData={macroData} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 18 }}>
            {macroData.map((m) => (
              <div key={m.name} style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: R.cardSm,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: m.color }} />
                  <span style={{ ...TYPE.kpiLabel, fontSize: 11 }}>{m.name}</span>
                </div>
                <div style={{ ...TYPE.number, fontSize: 22, fontWeight: 700, color: m.color, lineHeight: 1.1 }}>
                  {m.pct}%
                </div>
                <div style={{ ...TYPE.sourceCode, color: C.textFaint }}>{m.grams}g</div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard label="Key nutrients" sub="Daily intake vs RDA">
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {dashNutrients.map((n) => {
              const val = n.type === "vit" ? totals.daily.vitamins[n.k] : totals.daily.minerals[n.k];
              const p   = pct(val, n.rda);
              const fillColor = n.color || STATUS.ok;
              return (
                <div key={n.k}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontFamily: FONT.ui, fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{n.label}</div>
                    <div style={{ ...TYPE.number, color: C.textDim }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{val.toFixed(1)}</span>
                      <span style={{ color: C.textFaint, marginLeft: 4 }}>{n.unit}</span>
                      <span style={{ color: C.textFaint, marginLeft: 10 }}>{fmtPct(p)}</span>
                    </div>
                  </div>
                  <div style={{
                    height: 9,
                    background: C.surface2,
                    borderRadius: 999,
                    overflow: "hidden",
                    marginTop: 8,
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(p, 100)}%`,
                      background: fillColor,
                      borderRadius: 999,
                    }} />
                  </div>
                  {n.note && (
                    <div style={{ ...TYPE.rowMeta, color: STATUS.info, marginTop: 8 }}>
                      {n.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </PageShell>
  );
}
