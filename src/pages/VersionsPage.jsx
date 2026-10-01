import { useMemo } from "react";
import { C, STATUS, SP, FONT, TYPE, R, BTN } from "../constants.js";
import {
  PageShell, MetricCard, Card, SectionHeader,
  EmptyState, IconBtn,
} from "../components/ui.jsx";

// Saved plans page. Lists snapshots of the food plan. App owns the dietVersions array and the import/export helpers.
// addToast is optional, when given it shows feedback for destructive or confirming actions.
export default function VersionsPage({
  dietVersions, setDietVersions, setFoods, foods,
  onSaveVersion, exportAllVersions, importAllVersions,
  addToast,
}) {
  const toast = (msg, type = "info") => addToast?.(msg, type);

  const totalVersions   = dietVersions.length;
  const currentFoods    = foods?.length ?? 0;
  const currentActive   = foods?.filter((f) => f.enabled).length ?? 0;
  const latest = useMemo(() => {
    if (dietVersions.length === 0) return null;
    return dietVersions[dietVersions.length - 1];
  }, [dietVersions]);

  const handleRestore = (v) => {
    if (!confirm(`Restore "${v.name}"? Your current plan will be replaced.`)) return;
    setFoods(v.foods);
    toast(`Restored "${v.name}".`, "success");
  };

  const handleDelete = (v, idx) => {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return;
    setDietVersions((prev) => prev.filter((_, j) => j !== idx));
    toast(`Deleted "${v.name}".`, "success");
  };

  const handleExportOne = (v) => {
    try {
      const blob = new Blob([JSON.stringify(v, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `plan_${v.name.replace(/\s+/g, "_")}.json`;
      a.click();
      toast(`Exported "${v.name}".`, "success");
    } catch (err) {
      toast(`Export failed: ${err.message}`, "error");
    }
  };

  const handleSaveVersion    = () => { onSaveVersion?.(); };
  const handleExportAll      = () => { exportAllVersions?.(); toast("Export started.", "info"); };
  const handleImportAll      = () => { importAllVersions?.(); };

  return (
    <PageShell>
      <Card padding={18} style={{ borderColor: STATUS.ok + "40" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>💾</div>
          <div>
            <div style={{ ...TYPE.panelTitle, fontSize: 18, color: STATUS.ok, marginBottom: 4 }}>
              Saved automatically
            </div>
            <div style={{ ...TYPE.panelSub, color: C.textDim }}>
              Your foods and saved plans stay on this device. Use <strong style={{ color: C.text, fontWeight: 600 }}>Export</strong> below to back them up or move them to another device.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid-kpi-4">
        <MetricCard
          label="Saved Plans"
          value={totalVersions}
          sub={totalVersions === 0 ? "none yet" : "snapshots"}
          color={totalVersions === 0 ? STATUS.muted : STATUS.ok}
          accent={totalVersions === 0 ? null : STATUS.ok}
        />
        <MetricCard
          label="Current Foods"
          value={currentFoods}
          sub={`${currentActive} active`}
          color={STATUS.info}
          accent={STATUS.info}
        />
        <MetricCard
          label="Latest Snapshot"
          value={latest ? truncate(latest.name, 18) : "—"}
          sub={latest ? latest.date : "save one to start"}
          color={latest ? C.text : STATUS.muted}
        />
        <MetricCard
          label="Storage"
          value="On"
          sub="this device only"
          color={STATUS.ok}
          accent={STATUS.ok}
        />
      </div>

      <Card>
        <SectionHeader
          label="Plan management"
          sub="Snapshot the current plan, export a backup, or import one."
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={handleSaveVersion} style={BTN.primary()} aria-label="Save current plan as a new snapshot">
            + Save current plan
          </button>
          <button onClick={handleExportAll} style={BTN.secondary()} aria-label="Export all saved plans to a JSON file">
            ↓ Export all
          </button>
          <button onClick={handleImportAll} style={BTN.secondary()} aria-label="Import a saved-plans JSON file">
            ↑ Import backup
          </button>
        </div>
      </Card>

      {dietVersions.length === 0 ? (
        <Card>
          <EmptyState
            title="No saved plans yet"
            hint="Snapshot your current plan to come back to this exact configuration later."
          />
        </Card>
      ) : (
        <div className="grid-2-col">
          {[...dietVersions].reverse().map((v, reversedIdx) => {
            const idx = dietVersions.length - 1 - reversedIdx;
            const planCost   = v.foods.reduce((s, f) => s + f.price_per_unit * f.weekly_amount, 0);
            const planActive = v.foods.filter((f) => f.enabled).length;
            return (
              <Card key={`${v.name}-${v.date}-${idx}`} padding={20}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...TYPE.foodName, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {v.name}
                    </div>
                    <div style={TYPE.rowMeta}>{v.date}</div>
                  </div>
                  <IconBtn
                    onClick={() => handleDelete(v, idx)}
                    title={`Delete "${v.name}"`}
                    danger
                  >
                    ✕
                  </IconBtn>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                  gap: 12,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.cardSm,
                  padding: "12px 14px",
                  marginBottom: 14,
                }}>
                  <PlanStat label="Foods" value={v.foods.length} />
                  <PlanStat label="Active" value={planActive} color={STATUS.ok} />
                  <PlanStat label="Cost / wk" value={`$${planCost.toFixed(2)}`} color={STATUS.warn} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleRestore(v)}
                    style={BTN.primary()}
                    aria-label={`Restore plan "${v.name}"`}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleExportOne(v)}
                    style={BTN.secondary()}
                    aria-label={`Export plan "${v.name}"`}
                  >
                    ↓ Export
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function PlanStat({ label, value, color = C.text }) {
  return (
    <div>
      <div style={{ ...TYPE.kpiLabel, color: C.textFaint, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ ...TYPE.number, fontSize: 16, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function truncate(s, n) {
  if (typeof s !== "string") return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
