import { useState, useMemo, useCallback, useEffect } from "react";
import { C, STATUS, FONT, TYPE, SP, R, btnStyle, inputStyle, BTN } from "./constants.js";
import { StatChip } from "./components/ui.jsx";
import { INITIAL_FOODS } from "./data/foods.js";
import { computeTotals, calcTargets, migrateTaurineAndCreatine, migrateVitaminDUnits } from "./utils/nutrition.js";
import { storageGet, storageSet, deepClone } from "./utils/storage.js";
import useToast from "./hooks/useToast.js";
import ToastContainer from "./components/ToastContainer.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import DatabasePage from "./pages/DatabasePage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import CostPage from "./pages/CostPage.jsx";
import VersionsPage from "./pages/VersionsPage.jsx";
import { syncFoodNutrition, attachSourceMetadata } from "./utils/syncFoodNutrition.js";
import { isStale } from "./utils/isStale.js";
import { foodsToCSV, parseFoodsCSV, mergeFoodRecords, CsvImportError } from "./utils/csv.js";

function PageLabel({ children }) {
  return (
    <div style={{
      ...TYPE.pageTitle,
      marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

// Root component. Holds the app state (foods, saved plans, user stats) and syncs it with storage.
export default function App() {
  const [activePage,    setActivePage]    = useState("dashboard");
  const [editingFood,   setEditingFood]   = useState(null);
  const [addingFood,    setAddingFood]    = useState(false);
  const [activeCalcTab, setActiveCalcTab] = useState("macros");
  const [viewMode,      setViewMode]      = useState("daily");
  const [newFood,       setNewFood]       = useState(null);
  const [drillNutrient, setDrillNutrient] = useState(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionName,   setVersionName]   = useState("");
  const [storageReady,  setStorageReady]  = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);

  const [userStats, setUserStats] = useState({
    weightLb: 170,
    heightIn: 70,
    age:      30,
    sex:      "male",
    activity: "moderate",
  });
  const { calories: CAL_TARGET, protein: PROT_TARGET } = useMemo(
    () => calcTargets(userStats),
    [userStats],
  );

  const [foods,        setFoodsRaw]        = useState(INITIAL_FOODS);
  const [dietVersions, setDietVersionsRaw] = useState([]);
  const { toasts, addToast } = useToast();

  useEffect(() => {
    (async () => {
      const savedFoods = await storageGet("nutrition_foods");
      let loadedFoods = INITIAL_FOODS;
      if (savedFoods && Array.isArray(savedFoods)) {
        // Add a source block to foods that don't have one yet
        const migrated = savedFoods.map((f) => (f.source ? f : attachSourceMetadata(f, f.fdcId ?? null)));
        // Add foods that were added to INITIAL_FOODS since the last save
        const savedIds = new Set(migrated.map((f) => f.id));
        const newFoods = INITIAL_FOODS.filter((f) => !savedIds.has(f.id));
        loadedFoods = newFoods.length > 0 ? [...migrated, ...newFoods] : migrated;
      }
      // Fix taurine/creatine fields and vitamin D units before the first analytics render.
      loadedFoods = migrateVitaminDUnits(migrateTaurineAndCreatine(loadedFoods));
      storageSet("nutrition_foods", loadedFoods);
      setFoodsRaw(loadedFoods);

      const savedVersions = await storageGet("nutrition_versions");
      if (savedVersions && Array.isArray(savedVersions))
        setDietVersionsRaw(savedVersions);
      setStorageReady(true);

      // Re-sync foods with USDA data older than 30 days, in the background after the UI is ready.
      const staleFoods = loadedFoods.filter(
        (f) => f.source?.provider === "usda" && f.source?.fdcId && isStale(f.source.lastSyncedAt, 30),
      );
      if (staleFoods.length > 0) {
        const refreshed = await Promise.allSettled(
          staleFoods.map((f) => syncFoodNutrition(f)),
        );
        const updatedMap = {};
        refreshed.forEach((result, i) => {
          if (result.status === "fulfilled") updatedMap[staleFoods[i].id] = result.value;
        });
        if (Object.keys(updatedMap).length > 0) {
          setFoodsRaw((prev) => {
            const next = prev.map((f) => updatedMap[f.id] ?? f);
            storageSet("nutrition_foods", next);
            return next;
          });
        }
      }
    })();
  }, []);

  const setFoods = useCallback((updater) => {
    setFoodsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storageSet("nutrition_foods", next);
      return next;
    });
  }, []);

  const setDietVersions = useCallback((updater) => {
    setDietVersionsRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storageSet("nutrition_versions", next);
      return next;
    });
  }, []);

  const enabledFoods = useMemo(() => foods.filter((f) => f.enabled), [foods]);

  const totals = useMemo(() => computeTotals(enabledFoods), [enabledFoods]);

  const view = useMemo(
    () => (viewMode === "daily" ? totals.daily : totals.weekly),
    [viewMode, totals],
  );

  const updateFood = useCallback(
    (id, field, value) =>
      setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))),
    [setFoods],
  );

  const toggleFood = useCallback(
    (id) =>
      setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))),
    [setFoods],
  );

  const deleteFood = useCallback(
    (id, name) => {
      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
      setFoods((prev) => prev.filter((f) => f.id !== id));
    },
    [setFoods],
  );

  const confirmSaveVersion = () => {
    if (!versionName.trim()) return;
    setDietVersions((prev) => [
      ...prev,
      { name: versionName.trim(), foods: deepClone(foods), date: new Date().toLocaleString() },
    ]);
    setSavingVersion(false);
    setVersionName("");
  };

  const exportCSV = () =>
    _download(foodsToCSV(enabledFoods), "text/csv", "nutrition_plan.csv");

  const exportJSON = () =>
    _download(JSON.stringify(foods, null, 2), "application/json", "nutrition_plan.json");

  const exportAmounts = () => {
    const amounts = foods.map((f) => ({
      id: f.id, name: f.name || f.label || f.title || f.id,
      weekly_amount: f.weekly_amount,
      price_per_unit: f.price_per_unit, enabled: f.enabled,
    }));
    _download(
      JSON.stringify({ _type: "amounts_only", amounts }, null, 2),
      "application/json",
      "tracker_amounts.json",
    );
  };

  const exportAllVersions = () =>
    _download(
      JSON.stringify({ exportedAt: new Date().toISOString(), versions: dietVersions }, null, 2),
      "application/json",
      "nutrition_versions.json",
    );

  const importAmounts = () =>
    _readJSON((parsed) => {
      if (parsed._type === "amounts_only" && Array.isArray(parsed.amounts)) {
        const amountMap = Object.fromEntries(parsed.amounts.map((a) => [a.id, a]));
        setFoods((prev) =>
          prev.map((f) =>
            amountMap[f.id]
              ? { ...f, weekly_amount: amountMap[f.id].weekly_amount, price_per_unit: amountMap[f.id].price_per_unit, enabled: amountMap[f.id].enabled }
              : f,
          ),
        );
        addToast(`Restored amounts for ${parsed.amounts.length} foods.`, "success");
      } else {
        addToast("Not an amounts file.", "error");
      }
    });

  const importJSON = () =>
    _readJSON((parsed) => {
      if (parsed.versions && Array.isArray(parsed.versions)) {
        addToast("Looks like a versions backup — use ↑ Import Versions instead.", "warn");
        return;
      }
      if (Array.isArray(parsed) && parsed[0]?.name) {
        setFoods(parsed);
        addToast(`Imported ${parsed.length} foods.`, "success");
      } else if (parsed.foods && Array.isArray(parsed.foods)) {
        setFoods(parsed.foods);
        addToast(`Imported ${parsed.foods.length} foods from "${parsed.name}".`, "success");
      } else {
        addToast("Unrecognized JSON format.", "error");
      }
    });

  const importCSV = () =>
    _pickFile(".csv", (text) => {
      try {
        const result = mergeFoodRecords(foods, parseFoodsCSV(text));
        setFoods(result.foods);
        const kept = result.protected ? `; kept ${result.protected} manually entered value(s)` : "";
        addToast(`CSV import: ${result.updated} updated, ${result.added} added${kept}.`, "success");
      } catch (err) {
        if (!(err instanceof CsvImportError)) throw err;
        addToast(`CSV import failed: ${err.message}`, "error");
      }
    });

  const importAllVersions = () =>
    _readJSON((parsed) => {
      const versions = parsed.versions || parsed;
      if (Array.isArray(versions) && versions[0]?.name && versions[0]?.foods) {
        setDietVersions((prev) => {
          const merged = [...prev];
          versions.forEach((v) => {
            if (!merged.find((x) => x.name === v.name && x.date === v.date)) merged.push(v);
          });
          return merged;
        });
        addToast(`Imported ${versions.length} versions.`, "success");
      } else {
        addToast("Unrecognized versions format.", "error");
      }
    });

  const resetToDefaults = () => {
    if (confirm("Reset all foods to the original defaults? This cannot be undone."))
      setFoods(INITIAL_FOODS);
  };

  function _download(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function _pickFile(accept, onText) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => onText(ev.target.result);
      reader.readAsText(file);
    };
    input.click();
  }

  function _readJSON(onParsed) {
    _pickFile(".json", (text) => {
      try {
        onParsed(JSON.parse(text));
      } catch {
        addToast("Failed to parse JSON file.", "error");
      }
    });
  }

  if (!storageReady)
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui, gap: 16 }}>
        <div style={{ color: C.accent, fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", fontFamily: FONT.brand }}>⚡ TRACKER</div>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.border, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,80%,100%{background:${C.border}} 40%{background:${C.accent}} }`}</style>
      </div>
    );

  const pages = [
    { id: "dashboard", label: "Dashboard" },
    { id: "database",  label: "Food DB" },
    { id: "planner",   label: "Planner" },
    { id: "analytics", label: "Analytics" },
    { id: "cost",      label: "Cost" },
    { id: "versions",  label: "Saved Plans" },
  ];

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, color: C.text, fontFamily: FONT.ui, fontSize: 14, overflowX: "hidden", display: "flex", flexDirection: "column" }}>
      <ToastContainer toasts={toasts} />

      <div style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          color: STATUS.ok,
          fontWeight: 900,
          fontSize: 17,
          letterSpacing: "-0.02em",
          padding: "16px 24px 16px 0",
          borderRight: `1px solid ${C.border}`,
          marginRight: 18,
          whiteSpace: "nowrap",
          fontFamily: FONT.brand,
        }}>
          ⚡ TRACKER
        </div>

        {/* Page tabs - active state: brighter text + tinted background + accent underline */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {pages.map((p) => {
            const active = activePage === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                style={{
                  position: "relative",
                  background: active ? STATUS.ok + "12" : "transparent",
                  border: "none",
                  color: active ? STATUS.ok : C.textDim,
                  padding: "20px 18px",
                  cursor: "pointer",
                  ...TYPE.control,
                  fontSize: 14,
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {p.label}
                {active && (
                  <span style={{
                    position: "absolute",
                    bottom: 0, left: 12, right: 12, height: 2,
                    background: STATUS.ok,
                    borderRadius: 1,
                    boxShadow: `0 0 8px ${STATUS.ok}80`,
                  }} />
                )}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", padding: "12px 0" }}>
          <StatChip
            label="Calories"
            value={Math.round(totals.daily.calories)}
            target={CAL_TARGET}
            color={totals.daily.calories >= CAL_TARGET ? STATUS.ok : STATUS.warn}
          />
          <StatChip
            label="Protein"
            value={`${Math.round(totals.daily.protein)}g`}
            target={`${PROT_TARGET}g`}
            color={totals.daily.protein >= PROT_TARGET ? STATUS.ok : STATUS.warn}
          />
          <StatChip
            label="Cost / wk"
            value={`$${totals.weekly.cost.toFixed(2)}`}
            color={STATUS.warn}
          />
          <button
            onClick={() => setShowSettings((s) => !s)}
            title="Body stats & targets"
            style={{
              background: showSettings ? C.surface3 : C.surface2,
              border: `1px solid ${showSettings ? C.borderHi : C.border}`,
              color: showSettings ? STATUS.ok : C.textDim,
              borderRadius: R.btn,
              padding: "10px 14px",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            ⚙
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          userStats={userStats}
          setUserStats={setUserStats}
          calTarget={CAL_TARGET}
          protTarget={PROT_TARGET}
          onClose={() => setShowSettings(false)}
        />
      )}

      {savingVersion && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 10, padding: 24, width: 320 }}>
            <div style={{ color: C.text, fontWeight: 700, marginBottom: 12 }}>Save Version</div>
            <input
              autoFocus
              type="text"
              placeholder="Version name…"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  confirmSaveVersion();
                if (e.key === "Escape") setSavingVersion(false);
              }}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSavingVersion(false)} style={btnStyle(C.surface2)}>Cancel</button>
              <button onClick={confirmSaveVersion}            style={btnStyle(C.accentDim)}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        padding: `${SP.pagePadY}px 0 64px`,
        width: `min(${SP.pageMaxW}px, calc(100vw - 48px))`,
        maxWidth: "none",
        margin: "0 auto",
        boxSizing: "border-box",
      }}>
        {activePage === "dashboard" && (
          <>
            <PageLabel>Dashboard</PageLabel>
            <DashboardPage
              totals={totals}
              calTarget={CAL_TARGET}
              protTarget={PROT_TARGET}
              userStats={userStats}
            />
          </>
        )}

        {activePage === "database" && (
          <>
            <PageLabel>Food Database</PageLabel>
            <DatabasePage
              foods={foods}
              setFoods={setFoods}
              updateFood={updateFood}
              toggleFood={toggleFood}
              deleteFood={deleteFood}
              editingFood={editingFood}
              setEditingFood={setEditingFood}
              addingFood={addingFood}
              setAddingFood={setAddingFood}
              newFood={newFood}
              setNewFood={setNewFood}
              onSaveVersion={() => setSavingVersion(true)}
              exportCSV={exportCSV}
              exportJSON={exportJSON}
              exportAmounts={exportAmounts}
              importAmounts={importAmounts}
              importJSON={importJSON}
              importCSV={importCSV}
              resetToDefaults={resetToDefaults}
            />
          </>
        )}

        {activePage === "planner" && (
          <>
            <PageLabel>Weekly Planner</PageLabel>
            <PlannerPage
              foods={foods}
              updateFood={updateFood}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </>
        )}

        {activePage === "analytics" && (
          <>
            <PageLabel>Analytics</PageLabel>
            <AnalyticsPage
              enabledFoods={enabledFoods}
              view={view}
              totals={totals}
              viewMode={viewMode}
              setViewMode={setViewMode}
              activeCalcTab={activeCalcTab}
              setActiveCalcTab={setActiveCalcTab}
              drillNutrient={drillNutrient}
              setDrillNutrient={setDrillNutrient}
              calTarget={CAL_TARGET}
              protTarget={PROT_TARGET}
              userStats={userStats}
            />
          </>
        )}

        {activePage === "cost" && (
          <>
            <PageLabel>Cost Breakdown</PageLabel>
            <CostPage foods={foods} totals={totals} />
          </>
        )}

        {activePage === "versions" && (
          <>
            <PageLabel>Saved Plans</PageLabel>
            <VersionsPage
              dietVersions={dietVersions}
              setDietVersions={setDietVersions}
              setFoods={setFoods}
              foods={foods}
              onSaveVersion={() => setSavingVersion(true)}
              exportAllVersions={exportAllVersions}
              importAllVersions={importAllVersions}
              addToast={addToast}
            />
          </>
        )}
      </div>
    </div>
  );
}
