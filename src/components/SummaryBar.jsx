import { C, R, SP, TYPE } from "../constants.js";

// KPI strip at the top of the Planner and Database pages. Each item is { label, value, color? }.
export default function SummaryBar({ items, sticky = false }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: R.card,
      padding: "16px 24px",
      display: "flex",
      gap: 32,
      alignItems: "center",
      flexWrap: "wrap",
      ...(sticky && { position: "sticky", top: 12, zIndex: 30, marginBottom: SP.cardGapLg }),
    }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={TYPE.kpiLabel}>{item.label}</div>
          <div style={{
            ...TYPE.kpiValue,
            fontSize: 24,
            lineHeight: 1.05,
            color: item.color || C.text,
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
