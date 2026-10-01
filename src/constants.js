import { CATEGORIES } from "./data/schema.js";

// Green palette. Background, surface and border colors share one hue.
export const C = {
  bg:         "#101a14",
  surface:    "#172a20",
  surface2:   "#21362b",
  surface3:   "#2a4437",
  border:     "#2e4f3d",
  borderHi:   "#5b7b67",
  text:       "#edf6eb",
  textDim:    "#b8ccb6",  // ~6.5:1 contrast for body labels
  textFaint:  "#82997f",  // readable for helper/meta lines
  accent:     "#7dbb94",
  accentDim:  "#699778",
  accentGlow: "#7dbb9418",
  red:        "#ff8a7a",
  orange:     "#d69a58",
  gold:       "#d8b750",
  blue:       "#7cbad7",
  purple:     "#a586c1",
  teal:       "#75bbaa",
  stateOn:    "#7dbb94",
  stateOff:   "#4f6358",
  stateBorder:"#5d7a69",
};

// Status colors. Use these instead of raw C.red or C.orange for UI that carries meaning.
export const STATUS = {
  ok:      C.accent,    // mint  - on-target, success, active
  warn:    C.orange,    // amber - under-target, cost emphasis, soft caution
  danger:  C.red,       // coral - destructive actions, hard warning
  excess:  C.purple,    // lavender - overage, special / rare nutrient
  info:    C.teal,      // teal  - informational accent
  muted:   C.textFaint, // sage  - inactive, metadata
};

// Category colors. Meat is a deeper rust so it does not look like the danger red.
export const CATEGORY_COLORS = {
  [CATEGORIES.MEAT]:       "#bf6552", // rust  - distinct from STATUS.danger coral
  [CATEGORIES.SEAFOOD]:    C.teal,
  [CATEGORIES.DAIRY_EGGS]: "#e6b56a", // amber/cream - a touch warmer than C.orange
  [CATEGORIES.GRAIN]:      C.gold,
  [CATEGORIES.VEGETABLE]:  C.accent,
  [CATEGORIES.FRUIT]:      C.accentDim,
  [CATEGORIES.OTHER]:      "#8294a0", // muted slate
};

export const UNIT_LABELS = {
  each: "count",
  count: "count",
};

export const CHART_COLORS = [
  CATEGORY_COLORS.meat, C.teal, CATEGORY_COLORS.dairy_eggs, C.accentDim,
  C.purple, C.blue, C.gold, "#8090a0",
];

// Spacing, radius and size tokens
export const SP = {
  pageMaxW:      1800,
  pagePadX:      24,
  pagePadY:      36,
  cardGap:       20,
  cardGapLg:     24,
  cardPad:       22,
  cardPadLg:     28,
  cellPadX:      16,
  cellPadY:      14,
  rowMin:        56,
  rowMinDense:   48,
  // Offset below the sticky top nav bar (about 64px tall), where sticky strips should pin.
  stickyTop:     76,
};

export const R = {
  card:    14,
  cardSm:  12,
  pill:    999,
  btn:     10,
  btnSm:   8,
  input:   10,
};

export const FONT = {
  display: "'Space Grotesk', 'IBM Plex Sans', system-ui, sans-serif",
  brand:   "'Space Grotesk', 'IBM Plex Sans', system-ui, sans-serif",
  ui:      "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  num:     "'IBM Plex Mono','SFMono-Regular',Consolas,'Liberation Mono',monospace",
};

export const TYPE = {
  pageTitle:  { fontFamily: FONT.display, fontSize: 36, fontWeight: 750, lineHeight: 1.05, letterSpacing: "-0.04em", color: C.text },
  panelTitle: { fontFamily: FONT.display, fontSize: 24, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.03em", color: C.text },
  panelSub:   { fontFamily: FONT.ui, fontSize: 15, fontWeight: 500, lineHeight: 1.45, letterSpacing: 0, color: C.textFaint },
  kpiLabel:   { fontFamily: FONT.ui, fontSize: 13.5, fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.055em", color: C.textDim },
  kpiValue:   { fontFamily: FONT.num, fontSize: 54, fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums", color: C.text },
  kpiSub:     { fontFamily: FONT.ui, fontSize: 14.5, fontWeight: 500, lineHeight: 1.35, letterSpacing: 0, color: C.textFaint },
  tableHeader:{ fontFamily: FONT.ui, fontSize: 13.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.055em", color: C.textDim },
  foodName:   { fontFamily: FONT.ui, fontSize: 19, fontWeight: 750, lineHeight: 1.2, letterSpacing: "-0.015em", color: C.text },
  rowMeta:    { fontFamily: FONT.ui, fontSize: 14.5, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0, color: C.textFaint },
  number:     { fontFamily: FONT.num, fontSize: 17, fontWeight: 650, lineHeight: 1.25, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" },
  control:    { fontFamily: FONT.ui, fontSize: 15, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" },
  badge:      { fontFamily: FONT.ui, fontSize: 12.5, fontWeight: 700, lineHeight: 1.1, letterSpacing: 0 },
  sourceCode: { fontFamily: FONT.num, fontSize: 12.5, fontWeight: 650, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" },

  // Database table sizes (for a 2560x1440 desktop)
  dbNumber:      { fontFamily: FONT.num, fontSize: 22,   fontWeight: 750, lineHeight: 1.2,  letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" },
  dbTableHeader: { fontFamily: FONT.ui,  fontSize: 15.5, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.055em", lineHeight: 1.2 },
  dbSourceCode:  { fontFamily: FONT.num, fontSize: 15,   fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" },
  dbUnit:        { fontFamily: FONT.ui,  fontSize: 17,   fontWeight: 600, lineHeight: 1.25 },
  dbManual:      { fontFamily: FONT.ui,  fontSize: 16,   fontWeight: 600, lineHeight: 1.25 },

  // Analytics sizes (for a 2560x1440 desktop)
  analyticsTitle:    { fontFamily: FONT.display, fontSize: 26, fontWeight: 750, lineHeight: 1.15, letterSpacing: "-0.035em", color: C.text },
  analyticsLabel:    { fontFamily: FONT.ui,      fontSize: 18, fontWeight: 650, lineHeight: 1.3,  color: C.text },
  analyticsMeta:     { fontFamily: FONT.ui,      fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: C.textDim },
  analyticsValue:    { fontFamily: FONT.num,     fontSize: 22, fontWeight: 750, lineHeight: 1.2,  letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" },
  analyticsBigValue: { fontFamily: FONT.num,     fontSize: 36, fontWeight: 750, lineHeight: 1,    letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums" },
  analyticsControl:  { fontFamily: FONT.ui,      fontSize: 16, fontWeight: 700, lineHeight: 1.2,  letterSpacing: "-0.01em" },
};

export const T = {
  pageTitle:    TYPE.pageTitle,
  sectionLabel: TYPE.panelTitle,
  metric:       TYPE.kpiValue,
  metricSm:     { ...TYPE.kpiValue, fontSize: 24, lineHeight: 1.1 },
  body:         { fontSize: 14, color: C.text,    fontFamily: FONT.ui },
  bodyDim:      { ...TYPE.panelSub, color: C.textDim },
  helper:       TYPE.panelSub,
  num:          TYPE.number,
};

// Recharts tooltip theme - shared across every chart.
export const TT = {
  contentStyle: {
    background: "#0d1a12",
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: 13,
    fontFamily: FONT.ui,
    borderRadius: R.cardSm,
    padding: "10px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  itemStyle: { ...TYPE.number, color: C.text },
  labelStyle: { ...TYPE.kpiLabel, color: C.accent },
  wrapperStyle: { outline: "none" },
  cursor: { fill: "#52d98a0a" },
};

// Recharts axis defaults so every chart picks up the same readable tick style.
export const AXIS = {
  tick:      { fill: C.textDim, fontSize: 12, fontFamily: FONT.ui, fontWeight: 500 },
  axisLine:  { stroke: C.border },
  tickLine:  false,
  gridStroke: C.border,
};

export const btnStyle = (bg) => ({
  background: bg,
  color: C.text,
  border: "none",
  borderRadius: R.btn,
  padding: "12px 20px",
  cursor: "pointer",
  ...TYPE.control,
  transition: "all 0.18s ease",
});

export const btnSmall = {
  background: C.surface2,
  color: C.textDim,
  border: `1px solid ${C.border}`,
  borderRadius: R.btnSm,
  padding: "8px 12px",
  cursor: "pointer",
  ...TYPE.control,
  transition: "all 0.15s ease",
};

// Semantic button variants - prefer these over raw btnStyle(bg).
export const BTN = {
  primary: () => ({
    ...btnStyle(STATUS.ok),
    color: C.bg,
  }),
  secondary: () => ({
    ...btnStyle(C.surface2),
    color: C.textDim,
    border: `1px solid ${C.border}`,
  }),
  ghost: () => ({
    ...btnStyle("transparent"),
    color: C.textDim,
    border: `1px solid ${C.border}`,
  }),
  destructive: () => ({
    ...btnStyle("transparent"),
    color: STATUS.danger,
    border: `1px solid ${STATUS.danger}55`,
  }),
};

export const inputStyle = {
  width: "100%",
  background: C.bg,
  border: `1px solid ${C.border}`,
  color: C.text,
  padding: "12px 14px",
  borderRadius: R.input,
  fontSize: 15,
  fontFamily: FONT.ui,
  fontVariantNumeric: "tabular-nums",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export const labelSty = {
  fontSize: 12,
  color: C.textDim,
  display: "block",
  marginBottom: 8,
  fontFamily: FONT.ui,
  fontWeight: 650,
  letterSpacing: 0,
};

export const cardStyle = (opts = {}) => ({
  background: C.surface,
  borderRadius: R.card,
  border: `1px solid ${C.border}`,
  padding: opts.dense ? SP.cardPad : SP.cardPadLg,
  ...(opts.tinted && { borderColor: opts.tinted + "40" }),
});

export const WEEKS_PER_MONTH = 4.33;
