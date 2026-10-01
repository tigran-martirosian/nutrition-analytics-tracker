// Button that finds a USDA match for every manual food and syncs it.
// A food is skipped, not failed, when it is already USDA, has no good match, or is clearly not a USDA food (water, blends).

import { useState, useCallback } from "react";
import { C, FONT, btnStyle } from "../constants.js";
import { searchUSDA, fetchUSDAFoodWithMeta, USDA_API_KEY } from "../services/usdaClient.js";
import { syncFoodNutrition } from "../utils/syncFoodNutrition.js";

// Foods that are skipped because USDA data would not fit
const SKIP_IDS = new Set([]);

// Minimum name match score (0 to 1)
const MATCH_THRESHOLD = 0.25;

// Match score from 0 to 1, higher is better.
function matchScore(foodName, usdaDescription) {
  const a = foodName.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const b = usdaDescription.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const aWords = new Set(a.split(/\s+/));
  const bWords = b.split(/\s+/);
  const hits = bWords.filter((w) => aWords.has(w)).length;
  return hits / Math.max(aWords.size, 1);
}

// Prefers Foundation, then SR Legacy, then other data types
function dataTypePriority(dataType) {
  if (dataType === "Foundation") return 2;
  if (dataType === "SR Legacy")  return 1;
  return 0;
}

function pickBestResult(results, foodName) {
  if (!results.length) return null;
  const scored = results.map((r) => ({
    ...r,
    score: matchScore(foodName, r.description) + dataTypePriority(r.dataType) * 0.1,
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best.score >= MATCH_THRESHOLD ? best : null;
}

function StatusRow({ item }) {
  const icon =
    item.status === "done"    ? "✓" :
    item.status === "skipped" ? "–" :
    item.status === "error"   ? "✕" :
    item.status === "running" ? "…" : "·";

  const color =
    item.status === "done"    ? C.accent :
    item.status === "skipped" ? C.textDim :
    item.status === "error"   ? C.red :
    item.status === "running" ? C.gold : C.textFaint;

  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11, padding: "2px 0" }}>
      <span style={{ color, fontFamily: FONT.ui, width: 12, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: C.text, flex: 1 }}>{item.name}</span>
      <span style={{ color, fontSize: 10, textAlign: "right" }}>{item.msg}</span>
    </div>
  );
}

export default function BulkUSDASync({ foods, onSyncComplete }) {
  const [open,     setOpen]     = useState(false);
  const [running,  setRunning]  = useState(false);
  const [items,    setItems]    = useState([]);
  const [summary,  setSummary]  = useState(null);

  const manualFoods = foods.filter(
    (f) => f.source?.provider !== "usda" && !SKIP_IDS.has(f.id),
  );

  const setItemStatus = (id, status, msg) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status, msg } : x)));

  const handleSync = useCallback(async () => {
    if (!manualFoods.length) return;

    setRunning(true);
    setSummary(null);
    setItems(manualFoods.map((f) => ({ id: f.id, name: f.name, status: "pending", msg: "queued" })));

    const updatedFoods = {};
    let done = 0, skipped = 0, errors = 0;

    for (const food of manualFoods) {
      setItemStatus(food.id, "running", "searching USDA…");

      try {
        const results = await searchUSDA(food.name);
        const best = pickBestResult(results, food.name);

        if (!best) {
          setItemStatus(food.id, "skipped", "no confident USDA match");
          skipped++;
          continue;
        }

        setItemStatus(food.id, "running", `matched "${best.description.slice(0, 40)}…"`);

        const { nutrition, source } = await fetchUSDAFoodWithMeta(best.fdcId, best.description);

        const enriched = await syncFoodNutrition({
          ...food,
          nutrition_per_100g: nutrition,
          source,
          provenance: {},
        });

        updatedFoods[food.id] = enriched;
        setItemStatus(food.id, "done", `FDC ${best.fdcId}`);
        done++;

      } catch (err) {
        setItemStatus(food.id, "error", err.message.slice(0, 50));
        errors++;
      }

      // Small delay to stay under the USDA rate limit (30 requests per hour on DEMO_KEY)
      await new Promise((r) => setTimeout(r, 400));
    }

    if (Object.keys(updatedFoods).length > 0) {
      onSyncComplete((prev) => prev.map((f) => updatedFoods[f.id] ?? f));
    }

    setSummary({ done, skipped, errors, total: manualFoods.length });
    setRunning(false);
  }, [manualFoods, onSyncComplete]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ ...btnStyle(C.blue), fontSize: 11 }}
        title={`${manualFoods.length} foods need USDA import`}
      >
        ⟳ Sync all from USDA {manualFoods.length > 0 && `(${manualFoods.length})`}
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: 520, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>

        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>Sync all foods from USDA</div>
            <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>
              {manualFoods.length} manual foods · searches USDA + runs compound enrichment for each
            </div>
          </div>
          {!running && (
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>✕</button>
          )}
        </div>

        {!running && !summary && (
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
              This will search USDA FoodData Central for each food by name, pick the best
              Foundation or SR Legacy match, then run the full enrichment pipeline
              (K2, creatine, carnosine, taurine, hydroxyproline from the compound database).
              <br /><br />
              {USDA_API_KEY === "DEMO_KEY" && <span style={{ color: C.gold }}>⚠ Uses DEMO_KEY — rate-limited to ~30 requests/hr. Set VITE_USDA_API_KEY to use your own key.</span>}
              {" "}Foods are processed one at a time with a short delay.
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {items.map((item) => <StatusRow key={item.id} item={item} />)}
          </div>
        )}

        {summary && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
              <span style={{ color: C.accent }}>✓ {summary.done} updated</span>
              <span style={{ color: C.textDim }}>– {summary.skipped} skipped</span>
              {summary.errors > 0 && <span style={{ color: C.red }}>✕ {summary.errors} errors</span>}
            </div>
            <div style={{ color: C.textFaint, fontSize: 10, marginTop: 4 }}>
              {summary.done > 0 && "Nutrition data saved. Analytics will now reflect live USDA + enrichment values."}
              {summary.done === 0 && "No foods were updated. Try importing foods individually from the food editor."}
            </div>
          </div>
        )}

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {!running && !summary && (
            <>
              <button onClick={() => setOpen(false)} style={btnStyle(C.surface2)}>Cancel</button>
              <button onClick={handleSync} style={btnStyle(C.blue)}>
                Start sync ({manualFoods.length} foods)
              </button>
            </>
          )}
          {running && (
            <span style={{ fontSize: 12, color: C.gold, alignSelf: "center" }}>
              Syncing… do not close this window
            </span>
          )}
          {summary && !running && (
            <button onClick={() => setOpen(false)} style={btnStyle(C.accentDim)}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
