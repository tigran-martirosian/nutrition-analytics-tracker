// Shared UI pieces used by more than one page.

import { C, STATUS, SP, R, TYPE, FONT } from "../constants.js";

export function PageShell({ children, gap = SP.cardGapLg }) {
  return (
    <div style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap }}>
      {children}
    </div>
  );
}

// Small label above a section, with an optional slot on the right.
export function SectionHeader({ label, sub, right, accent = C.textDim }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 16 }}>
      <div>
        <div style={{ ...TYPE.panelTitle, color: accent === C.textDim ? C.text : accent }}>{label}</div>
        {sub && <div style={{ ...TYPE.panelSub, marginTop: 5 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

export function Card({ children, dense, tinted, padding, style, onClick, className }) {
  const pad = padding ?? (dense ? SP.cardPad : SP.cardPadLg);
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: C.surface,
        borderRadius: R.card,
        border: `1px solid ${tinted ? tinted + "40" : C.border}`,
        padding: pad,
        ...(onClick && { cursor: "pointer" }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// KPI card: title, big number, optional sub-line and trend hint.
export function MetricCard({ label, value, sub, trend, color = STATUS.ok, accent }) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: R.card,
      border: `1px solid ${accent ? accent + "30" : C.border}`,
      padding: `${SP.cardPad}px`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: 136,
      boxSizing: "border-box",
      gap: 6,
    }}>
      <div style={TYPE.kpiLabel}>{label}</div>
      <div style={{ ...TYPE.kpiValue, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={TYPE.kpiSub}>{sub}</div>}
      {trend && <div style={{ ...TYPE.kpiSub, color: trend.color || C.textFaint }}>{trend.text}</div>}
    </div>
  );
}

export function ChartCard({ label, sub, right, children, padding, minHeight = 400 }) {
  return (
    <Card padding={padding ?? SP.cardPadLg} style={{ minHeight, display: "flex", flexDirection: "column" }}>
      <SectionHeader label={label} sub={sub} right={right} />
      {children}
    </Card>
  );
}

export function SegmentedToggle({ options, value, onChange, size = "md" }) {
  const cfg = size === "sm"
    ? { padX: 11, padY: 6, font: 12 }
    : { padX: 14, padY: 8, font: 13 };
  return (
    <div style={{
      display: "inline-flex",
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: R.btn,
      padding: 3,
      gap: 2,
    }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: `${cfg.padY}px ${cfg.padX}px`,
              ...TYPE.control,
              fontSize: cfg.font,
              borderRadius: R.btnSm,
              background: active ? STATUS.ok : "transparent",
              color: active ? C.bg : C.textDim,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChip({ label, active, onClick, accent, count }) {
  const fillColor = accent || STATUS.ok;
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? fillColor : "transparent",
        color: active ? C.bg : C.textDim,
        border: `1px solid ${active ? fillColor : C.border}`,
        borderRadius: R.pill,
        padding: "7px 14px",
        cursor: "pointer",
        ...TYPE.control,
        transition: "all 0.15s",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        textTransform: "capitalize",
      }}
    >
      {label}
      {count != null && (
        <span style={{
          ...TYPE.sourceCode,
          opacity: 0.75,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// Small label/value chip for the top nav. target is optional and shown after a "/".
export function StatChip({ label, value, target, color = C.text, mono = true }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      padding: "8px 14px",
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: R.btn,
    }}>
      <span style={TYPE.kpiLabel}>{label}</span>
      <span style={{
        ...TYPE.number,
        fontSize: 16,
        fontWeight: 700,
        color,
        fontFamily: mono ? FONT.num : FONT.ui,
        whiteSpace: "nowrap",
      }}>
        {value}
        {target != null && (
          <span style={{ color: C.textFaint, fontSize: 13, fontWeight: 500, marginLeft: 2 }}>
            /{target}
          </span>
        )}
      </span>
    </div>
  );
}

// Category header band shared by Food DB and Planner. Clickable when onClick is given.
export function CategoryHeader({ color, name, count, subtotals = [], onClick, collapsed }) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      aria-expanded={interactive ? !collapsed : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        padding: "12px 18px",
        background: color + "15",
        borderLeft: `3px solid ${color}`,
        borderRadius: R.cardSm,
        cursor: interactive ? "pointer" : "default",
        marginBottom: 10,
        transition: "background 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {interactive && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              fontSize: 14,
              color: color,
              transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
              transition: "transform 0.18s",
              width: 14,
              textAlign: "center",
              fontFamily: FONT.ui,
            }}
          >
            ▸
          </span>
        )}
        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        <span style={{ ...TYPE.foodName, fontSize: 15, color, textTransform: "capitalize" }}>
          {name}
        </span>
        <span style={{ ...TYPE.rowMeta, color: C.textDim }}>
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {subtotals.map((s) => (
          <div key={s.label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ ...TYPE.kpiLabel, fontSize: 11, color: C.textFaint }}>{s.label}</span>
            <span style={{ ...TYPE.number, color: s.color || C.text, fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarningBadge({ text, level = "warn" }) {
  const c = level === "danger" ? STATUS.danger : STATUS.warn;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      ...TYPE.badge, color: c,
      background: c + "1a", border: `1px solid ${c}55`,
      padding: "2px 6px", borderRadius: R.btnSm,
      whiteSpace: "nowrap",
    }}>
      ⚠ {text}
    </span>
  );
}

// Muted badge such as "USDA 12345". style can swap in a larger token.
export function SourceBadge({ label, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      ...TYPE.sourceCode, color: C.textDim,
      background: C.bg, border: `1px solid ${C.border}`,
      padding: "4px 10px", borderRadius: R.btnSm,
      ...style,
    }}>
      {label}
    </span>
  );
}

export function ToggleSwitch({ on, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        position: "relative",
        width: 42, height: 22,
        borderRadius: R.pill,
        background: on ? STATUS.ok : C.surface3,
        border: `1px solid ${on ? STATUS.ok : C.border}`,
        cursor: "pointer",
        transition: "background 0.18s, border-color 0.18s",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 2, left: on ? 22 : 2,
        width: 16, height: 16,
        borderRadius: "50%",
        background: on ? C.bg : C.textDim,
        transition: "left 0.18s, background 0.18s",
      }} />
    </button>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div style={{
      padding: "60px 20px", textAlign: "center",
      color: C.textFaint, fontFamily: FONT.ui,
    }}>
      <div style={{ ...TYPE.panelTitle, fontSize: 18, color: C.textDim, marginBottom: 6 }}>{title}</div>
      {hint && <div style={TYPE.panelSub}>{hint}</div>}
    </div>
  );
}

export function IconBtn({ children, onClick, danger, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: R.btnSm,
        color: danger ? STATUS.danger : C.textDim,
        fontSize: 15,
        fontFamily: FONT.ui,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? STATUS.danger + "1a" : C.surface3;
        e.currentTarget.style.borderColor = danger ? STATUS.danger + "55" : C.borderHi;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = C.surface2;
        e.currentTarget.style.borderColor = C.border;
      }}
    >
      {children}
    </button>
  );
}
