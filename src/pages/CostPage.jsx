import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, CATEGORY_COLORS, CHART_COLORS, TT, AXIS, STATUS, SP, FONT, TYPE, R, WEEKS_PER_MONTH } from "../constants.js";
import CategoryDot from "../components/CategoryDot.jsx";
import { MetricCard, ChartCard, PageShell, EmptyState } from "../components/ui.jsx";

// Cost breakdown page: KPI row on top, then a 2fr/1fr split.
export default function CostPage({ foods, totals }) {
  const enabledFoods = foods.filter((f) => f.enabled);
  const weekly      = totals.weekly.cost;
  const monthly     = weekly * WEEKS_PER_MONTH;
  const costPerCal  = weekly / (totals.weekly.calories || 1);
  const costPerProt = weekly / (totals.weekly.protein || 1);

  const byFood = enabledFoods
    .map((f) => ({
      name:     f.name.length > 22 ? f.name.slice(0, 20) + "…" : f.name,
      fullName: f.name,
      cost:     parseFloat((f.price_per_unit * f.weekly_amount).toFixed(2)),
      category: f.category,
    }))
    .filter((f) => f.cost > 0)
    .sort((a, b) => b.cost - a.cost);

  const chartHeight = Math.max(280, byFood.length * 28 + 60);

  const byCategory = Object.entries(
    enabledFoods.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + f.price_per_unit * f.weekly_amount;
      return acc;
    }, {}),
  )
    .filter(([, cost]) => cost > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <PageShell>
      <div className="grid-kpi-4">
        <MetricCard label="Weekly Total"      value={`$${weekly.toFixed(2)}`}              sub={`${enabledFoods.length} enabled foods`} color={STATUS.ok}     accent={STATUS.ok} />
        <MetricCard label="Monthly Projected" value={`$${monthly.toFixed(2)}`}             sub="4.33 weeks"                              color={STATUS.info}   accent={STATUS.info} />
        <MetricCard label="Cost / 1000 kcal"  value={`$${(costPerCal * 1000).toFixed(2)}`} sub="weekly basis"                            color={STATUS.warn}   accent={STATUS.warn} />
        <MetricCard label="Cost / g Protein"  value={`$${costPerProt.toFixed(3)}`}         sub="weekly basis"                            color={STATUS.excess} accent={STATUS.excess} />
      </div>

      <div className="grid-2-col-wide-left">
        <ChartCard label="Cost by item" sub="Weekly · enabled foods only">
          {byFood.length === 0 ? (
            <EmptyState
              title="No cost data yet"
              hint="Add prices and weekly amounts to enabled foods to see this chart."
            />
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={byFood} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={AXIS.gridStroke} horizontal={false} />
                <XAxis type="number"   tick={AXIS.tick} tickFormatter={(v) => `$${v}`} axisLine={AXIS.axisLine} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS.tick, fill: C.text }} width={170} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={TT.contentStyle}
                  itemStyle={TT.itemStyle}
                  labelStyle={TT.labelStyle}
                  wrapperStyle={TT.wrapperStyle}
                  cursor={TT.cursor}
                  formatter={(v) => `$${Number(v).toFixed(2)} / week`}
                />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {byFood.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.category] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard label="By category" sub="Share of weekly spend">
          {byCategory.length === 0 && (
            <EmptyState
              title="No categories with cost"
              hint="Enable foods and set prices to populate this breakdown."
            />
          )}
          {byCategory.map(([cat, cost]) => {
            const pctOfTotal = weekly > 0 ? (cost / weekly) * 100 : 0;
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CategoryDot category={cat} />
                    <span style={{ ...TYPE.rowMeta, color: C.text, textTransform: "capitalize", fontWeight: 650 }}>{cat.replace("_", " ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ ...TYPE.number, color: C.text }}>${cost.toFixed(2)}</span>
                    <span style={{ ...TYPE.sourceCode, color: C.textFaint, width: 40, textAlign: "right" }}>{pctOfTotal.toFixed(0)}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: C.surface2, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${pctOfTotal}%`,
                    background: CATEGORY_COLORS[cat] || C.textDim,
                    borderRadius: 3,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
            );
          })}
        </ChartCard>
      </div>
    </PageShell>
  );
}
