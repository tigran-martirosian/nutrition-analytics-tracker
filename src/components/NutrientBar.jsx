import { C, FONT, STATUS, TYPE } from "../constants.js";
import { pct, fmtPct } from "../utils/nutrition.js";

// Colour by percent of target: under 50 danger, under 80 warn, 80 to 200 ok, up to 300 warn, above that excess.
function nutrientStatus(p) {
  if (p < 50)  return STATUS.danger;
  if (p < 80)  return STATUS.warn;
  if (p > 300) return STATUS.excess;
  if (p > 200) return STATUS.warn;
  return STATUS.ok;
}

// Progress row for nutrient cards. The bar stops at 100% but the text shows the real percent.
export default function NutrientBar({ label, value, rda, unit = "mg", decimals = 1 }) {
  const hasTarget = rda != null && rda > 0;
  const p = hasTarget ? pct(value, rda) : null;
  const c = hasTarget ? nutrientStatus(p) : C.accent;
  const barWidth = hasTarget ? Math.min(Math.max(p, 0), 100) : 0;

  return (
    <div style={{ marginBottom: label ? 12 : 0, fontFamily: FONT.ui }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6, gap: 12,
      }}>
        {label && <span style={{ ...TYPE.analyticsLabel, color: C.textDim }}>{label}</span>}
        <span style={{ ...TYPE.analyticsValue, color: c, marginLeft: "auto" }}>
          {value.toFixed(decimals)}{unit}
          {hasTarget && (
            <span style={{ color: C.textFaint, marginLeft: 8, fontSize: 17, fontWeight: 600 }}>{fmtPct(p)}</span>
          )}
        </span>
      </div>
      {hasTarget && (
        <div style={{ height: 10, background: C.surface2, borderRadius: 5, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${barWidth}%`,
            background: c,
            borderRadius: 5,
            transition: "width 0.3s",
          }} />
        </div>
      )}
    </div>
  );
}
