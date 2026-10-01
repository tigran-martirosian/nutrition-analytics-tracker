import { C, FONT } from "../constants.js";

const Row = ({ label, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 12, color: C.textDim }}>{label}</span>
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{children}</div>
  </div>
);

const SmInput = ({ value, onChange, step = 1, min = 0, width = 64 }) => (
  <input
    type="number"
    value={value}
    onChange={onChange}
    step={step}
    min={min}
    style={{ width, background: C.bg, border: `1px solid ${C.border}`, color: C.text, padding: "4px 8px", borderRadius: 4, fontSize: 12, textAlign: "center" }}
  />
);

// Panel for editing body stats. Shows the calorie and protein targets and BMI/IBW.
export default function SettingsPanel({ userStats, setUserStats, calTarget, protTarget }) {
  const set = (k, v) => setUserStats((p) => ({ ...p, [k]: v }));
  const heightFt = Math.floor(userStats.heightIn / 12);
  const heightIn = userStats.heightIn % 12;

  return (
    <div style={{ background: C.surface, borderBottom: `1px solid ${C.borderHi}`, padding: "14px 28px" }}>
      <div style={{ maxWidth: 700, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
        <div>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 0.25, marginBottom: 8, fontFamily: FONT.ui }}>
            BODY STATS
          </div>
          <Row label="Weight (lb)">
            <SmInput value={userStats.weightLb} onChange={(e) => set("weightLb", +e.target.value)} step={1} min={80} />
          </Row>
          <Row label="Height">
            <SmInput value={heightFt} onChange={(e) => set("heightIn", +e.target.value * 12 + heightIn)} width={40} /> ft
            <SmInput value={heightIn} onChange={(e) => set("heightIn", heightFt * 12 + +e.target.value)} min={0} width={40} /> in
          </Row>
          <Row label="Age">
            <SmInput value={userStats.age} onChange={(e) => set("age", +e.target.value)} min={15} />
          </Row>
          <Row label="Sex">
            {["male", "female"].map((s) => (
              <button
                key={s}
                onClick={() => set("sex", s)}
                style={{ background: userStats.sex === s ? C.accentDim : C.surface2, color: userStats.sex === s ? C.bg : C.textDim, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
              >
                {s}
              </button>
            ))}
          </Row>
          <Row label="Activity">
            <select
              value={userStats.activity}
              onChange={(e) => set("activity", e.target.value)}
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 4, padding: "4px 8px", fontSize: 11 }}
            >
              {[
                ["sedentary",   "Sedentary (desk job)"],
                ["light",       "Light (1–3x/wk)"],
                ["moderate",    "Moderate (3–5x/wk)"],
                ["active",      "Active (6–7x/wk)"],
                ["very_active", "Very Active (athlete)"],
              ].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Row>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 0.25, marginBottom: 8, fontFamily: FONT.ui }}>
            CALCULATED TARGETS
          </div>
          <div style={{ background: C.bg, borderRadius: 8, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 2, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.2 }}>Daily Calories</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.accent, fontFamily: FONT.num, letterSpacing: 0 }}>{calTarget}</div>
                <div style={{ fontSize: 12, color: C.textFaint }}>Mifflin-St Jeor + activity</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: C.textDim, marginBottom: 2, textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.2 }}>Daily Protein</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.teal, fontFamily: FONT.num, letterSpacing: 0 }}>{protTarget}g</div>
                <div style={{ fontSize: 12, color: C.textFaint }}>0.82g × body weight lb</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.textDim }}>
              BMI:{" "}
              <span style={{ color: C.text }}>
                {((userStats.weightLb * 703) / userStats.heightIn ** 2).toFixed(1)}
              </span>
              {" · "}IBW:{" "}
              <span style={{ color: C.text }}>
                {Math.round(userStats.sex === "male"
                  ? 50 + 2.3 * (userStats.heightIn - 60)
                  : 45.5 + 2.3 * (userStats.heightIn - 60))}kg
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.5 }}>
            Targets update all RDA bars, nav counters, and macro comparisons automatically across the app.
          </div>
        </div>
      </div>
    </div>
  );
}
