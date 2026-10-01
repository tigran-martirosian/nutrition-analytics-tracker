import { useState, useCallback } from "react";
import { C, btnStyle, inputStyle, labelSty, UNIT_LABELS } from "../constants.js";
import { NUTRIENT_META } from "../data/nutrientMeta.js";
import { CATEGORIES, UNITS } from "../data/schema.js";
import { deepClone } from "../utils/storage.js";
import useNumericDraft from "../hooks/useNumericDraft.js";
import { searchUSDA, fetchUSDAFoodWithMeta } from "../services/usdaClient.js";
import { syncFoodNutrition, attachSourceMetadata } from "../utils/syncFoodNutrition.js";
import { isStale } from "../utils/isStale.js";

export default function FoodEditModal({ food: initialFood, onSave, onClose }) {
  const isNew = !initialFood.name;
  const [tab, setTab]           = useState(isNew ? "search" : "basic");
  const [draft, setDraftState]  = useState(() => {
    const base = deepClone(initialFood);
    return base.source ? base : attachSourceMetadata(base, base.fdcId ?? null);
  });
  const { getDraft, setDraft, commitDraft } = useNumericDraft();

  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [importing,  setImporting]  = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchErr,  setSearchErr]  = useState("");
  const [imported,   setImported]   = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");

  const hasFdc     = !!draft.source?.fdcId;
  const lastSynced = draft.source?.lastSyncedAt;
  const stale      = isStale(lastSynced, 30);

  const setStr = (field, val) => setDraftState((prev) => ({ ...prev, [field]: val }));

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setSearchErr(""); setResults([]);
    try {
      const hits = await searchUSDA(query.trim());
      setResults(hits);
      if (hits.length === 0) setSearchErr('No results. Try a simpler term, e.g. "chicken breast raw".');
    } catch (err) { setSearchErr(`Search failed: ${err.message}`); }
    finally { setSearching(false); }
  }, [query]);

  const handleImport = useCallback(async (fdcId, description) => {
    setImporting(fdcId); setSearchErr(""); setSyncMsg("Fetching USDA data…");
    try {
      const { nutrition, source } = await fetchUSDAFoodWithMeta(fdcId, description);
      const partial = {
        ...draft,
        id: draft.id || description.toLowerCase().replace(/\s+/g,"_").slice(0,32),
        name: draft.name || description,
        nutrition_per_100g: nutrition,
        source,
        provenance: {},
        manual_overrides: draft.manual_overrides ?? {},
      };
      setSyncMsg("Running enrichment pipeline…");
      const enriched = await syncFoodNutrition(partial);
      setDraftState(enriched);
      setImported(true);
      setSyncMsg("✓ USDA + compound enrichment complete");
      setTab("basic");
    } catch (err) { setSearchErr(`Import failed: ${err.message}`); setSyncMsg(""); }
    finally { setImporting(null); }
  }, [draft]);

  const handleRefresh = useCallback(async () => {
    if (!draft.source?.fdcId) return;
    setRefreshing(true); setSyncMsg("Re-syncing from USDA…");
    try {
      const refreshed = await syncFoodNutrition(draft, { forceUSDA: true });
      setDraftState(refreshed);
      setSyncMsg("✓ Refreshed from USDA + enrichment");
    } catch (err) { setSyncMsg(`Refresh failed: ${err.message}`); }
    finally { setRefreshing(false); }
  }, [draft]);

  const NumInput = ({ path, committed, step = 0.01 }) => (
    <input type="number" step={step} min={0}
      value={getDraft(path, committed)}
      onChange={(e) => setDraft(path, e.target.value)}
      onBlur={() => commitDraft(path, (val) => {
        setDraftState((prev) => {
          const next = deepClone(prev);
          const parts = path.split(".");
          let cur = next;
          for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
          cur[parts[parts.length - 1]] = val;
          return next;
        });
      })}
      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
      style={inputStyle}
    />
  );

  const showWeightWarning = (draft.unit === "each" || draft.unit === "count") && (!draft.item_weight_grams || draft.item_weight_grams <= 0);
  const categoryKeys = Object.values(CATEGORIES);
  const unitKeys     = Object.values(UNITS).map((u) => u.key);
  const tabs         = ["search","basic","macros","fats","vitamins","minerals","amino","source"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, width:640, maxHeight:"90vh", overflow:"auto", padding:24 }}>

        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>
            {draft.name || "New Food"}
            {imported && <span style={{ fontSize:11, color:C.accent, marginLeft:10, fontWeight:400 }}>✓ USDA data imported</span>}
            {hasFdc && stale && !imported && <span style={{ fontSize:10, color:C.gold, marginLeft:10, fontWeight:400 }}>⚠ Data may be stale</span>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.textDim, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ display:"flex", gap:4, marginBottom:16, flexWrap:"wrap" }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ ...btnStyle(tab === t ? (t==="search" ? C.blue : C.red) : C.surface), fontSize:11 }}>
              {t==="search" ? "🔍 USDA" : t==="source" ? "📡 Source" : t.toUpperCase()}
            </button>
          ))}
        </div>

        {syncMsg && (
          <div style={{ background:C.accent+"18", border:`1px solid ${C.accent}40`, borderRadius:6, padding:"6px 12px", fontSize:11, color:C.accent, marginBottom:12 }}>
            {syncMsg}
          </div>
        )}

        {tab === "search" && (
          <div>
            <div style={{ fontSize:11, color:C.textDim, marginBottom:12, lineHeight:1.6 }}>
              Search USDA FoodData Central. Importing runs the full enrichment pipeline —
              K2, creatine, taurine, hydroxyproline, carnosine and anserine are filled
              automatically from the secondary compound database.
            </div>
            <form onSubmit={handleSearch} style={{ display:"flex", gap:8, marginBottom:12 }}>
              <input type="text" placeholder='e.g. "chicken breast raw"' value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ ...inputStyle, flex:1 }} autoFocus />
              <button type="submit" disabled={searching} style={{ ...btnStyle(C.blue), whiteSpace:"nowrap", opacity:searching?0.6:1 }}>
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
            {searchErr && (
              <div style={{ background:C.red+"18", border:`1px solid ${C.red}40`, borderRadius:6, padding:"8px 12px", fontSize:11, color:C.red, marginBottom:12 }}>
                {searchErr}
              </div>
            )}
            {results.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:360, overflowY:"auto" }}>
                {results.map((r) => (
                  <div key={r.fdcId} style={{ background:C.surface, borderRadius:8, padding:"10px 14px", border:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:C.text, fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.description}</div>
                      <div style={{ color:C.textFaint, fontSize:10, marginTop:2 }}>{r.dataType} · FDC {r.fdcId}{r.category ? ` · ${r.category}` : ""}</div>
                    </div>
                    <button onClick={() => handleImport(r.fdcId, r.description)} disabled={!!importing}
                      style={{ ...btnStyle(importing===r.fdcId ? C.surface2 : C.accentDim), fontSize:11, whiteSpace:"nowrap", flexShrink:0, opacity:importing&&importing!==r.fdcId?0.5:1 }}>
                      {importing === r.fdcId ? "Importing…" : "Import"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {results.length === 0 && !searching && !searchErr && (
              <div style={{ textAlign:"center", padding:"32px 0", color:C.textFaint, fontSize:12 }}>
                Search above to pull nutrition data automatically.<br/>
                <span style={{ fontSize:10 }}>Or skip and fill everything manually on the other tabs.</span>
              </div>
            )}
            {imported && (
              <div style={{ marginTop:16, padding:"10px 14px", background:C.accent+"18", border:`1px solid ${C.accent}40`, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:C.accent, fontSize:12 }}>✓ Imported. Set quantity and price on the Basic tab.</span>
                <button onClick={() => setTab("basic")} style={{ ...btnStyle(C.accentDim), fontSize:11 }}>Go to Basic →</button>
              </div>
            )}
          </div>
        )}

        {tab === "basic" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={labelSty}>Name</label><input type="text" value={draft.name||""} onChange={(e)=>setStr("name",e.target.value)} style={inputStyle}/></div>
            <div><label style={labelSty}>Category</label><select value={draft.category||"meat"} onChange={(e)=>setStr("category",e.target.value)} style={inputStyle}>{categoryKeys.map((o)=><option key={o} value={o}>{o}</option>)}</select></div>
            <div><label style={labelSty}>Quality Notes</label><input type="text" value={draft.quality||""} onChange={(e)=>setStr("quality",e.target.value)} style={inputStyle}/></div>
            <div><label style={labelSty}>Weekly Amount</label><NumInput path="weekly_amount" committed={draft.weekly_amount} step={0.1}/></div>
            <div><label style={labelSty}>Unit</label><select value={draft.unit||"lb"} onChange={(e)=>setDraftState((prev)=>({...prev,unit:e.target.value}))} style={inputStyle}>{unitKeys.map((o)=><option key={o} value={o}>{UNIT_LABELS[o] || o}</option>)}</select></div>
            {(draft.unit === "each" || draft.unit === "count") && (
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ ...labelSty, color:showWeightWarning?C.gold:C.textDim }}>Weight per item (grams){showWeightWarning?" ← REQUIRED for nutrient calculations":""}</label>
                <NumInput path="item_weight_grams" committed={draft.item_weight_grams||""} step={1}/>
                {showWeightWarning && <div style={{ fontSize:10, color:C.gold, marginTop:4 }}>⚠ Without this, food is excluded from all nutrient totals.</div>}
              </div>
            )}
            <div><label style={labelSty}>Price per Unit ($)</label><NumInput path="price_per_unit" committed={draft.price_per_unit} step={0.01}/></div>
            <div><label style={labelSty}>Price Note (optional)</label><input type="text" value={draft.price_note||""} onChange={(e)=>setStr("price_note",e.target.value)} style={inputStyle}/></div>
          </div>
        )}

        {tab === "macros" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {["calories","protein","fat","carbs","omega3","omega6","creatine","taurine"].map((k)=>(
              <div key={k}><label style={labelSty}>{k} (per 100g)</label><NumInput path={`nutrition_per_100g.${k}`} committed={draft.nutrition_per_100g[k]??0} step={0.01}/></div>
            ))}
          </div>
        )}

        {tab === "fats" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.entries(NUTRIENT_META.fats).map(([k,meta])=>(
              <div key={k}>
                <label style={labelSty}>{meta.label} ({meta.unit}/100g)</label>
                <NumInput path={`nutrition_per_100g.fats.${k}`} committed={draft.nutrition_per_100g.fats?.[k]??0} step={0.001}/>
                {k==="trans" && <div style={{ fontSize:9, color:C.textDim, marginTop:2 }}>Includes natural ruminant trans fats (CLA/vaccenic)</div>}
              </div>
            ))}
          </div>
        )}

        {tab === "vitamins" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.entries(NUTRIENT_META.vitamins).map(([k,meta])=>{
              const isD = k==="d";
              const storedUnit = draft.nutrition_units?.vitamins?.d || "μg";
              const prov = draft.provenance?.[`vitamins.${k}`];
              return (
                <div key={k}>
                  <label style={labelSty}>
                    {meta.label} {isD ? `(stored as ${storedUnit}, per 100g)` : `(${meta.unit}/100g)`}
                    {k==="k2" && <span style={{ color:C.gold, marginLeft:4, fontSize:9 }}>★ secondary db</span>}
                    {prov && <span style={{ color:prov.confidence==="high"?C.accent:prov.confidence==="medium"?C.gold:C.red, marginLeft:4, fontSize:9 }}>[{prov.source}]</span>}
                  </label>
                  <NumInput path={`nutrition_per_100g.vitamins.${k}`} committed={draft.nutrition_per_100g.vitamins?.[k]??0} step={0.01}/>
                  {isD && (
                    <div style={{ fontSize:9, color:C.textDim, marginTop:2 }}>
                      {storedUnit==="IU" ? "IU auto-converted to μg (÷40)" : "Enter in μg directly"}
                      {" · "}
                      <span style={{ color:C.teal, cursor:"pointer", textDecoration:"underline" }}
                        onClick={()=>setDraftState((prev)=>({...prev,nutrition_units:{...prev.nutrition_units,vitamins:{...prev.nutrition_units?.vitamins,d:storedUnit==="IU"?"μg":"IU"}}}))}>
                        Switch to {storedUnit==="IU"?"μg":"IU"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "minerals" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.entries(NUTRIENT_META.minerals).map(([k,meta])=>(
              <div key={k}><label style={labelSty}>{meta.label} ({meta.unit}/100g)</label><NumInput path={`nutrition_per_100g.minerals.${k}`} committed={draft.nutrition_per_100g.minerals?.[k]??0} step={0.01}/></div>
            ))}
          </div>
        )}

        {tab === "amino" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {Object.keys(draft.nutrition_per_100g.amino_acids??{}).map((k)=>{
              const prov = draft.provenance?.[`amino_acids.${k}`];
              return (
                <div key={k}>
                  <label style={labelSty}>
                    {/* Capitalize only the amino-acid name; keep the unit suffix lowercase
                        so we render "Glycine (g/100g)" instead of "Glycine (G/100g)". */}
                    <span style={{ textTransform:"capitalize" }}>{k.replace(/_/g," ")}</span>
                    {" "}(g/100g)
                    {(k==="hydroxyproline"||k==="taurine") && <span style={{ color:C.gold, marginLeft:4, fontSize:9 }}>★ secondary db</span>}
                    {prov && <span style={{ color:prov.confidence==="high"?C.accent:prov.confidence==="medium"?C.gold:C.red, marginLeft:4, fontSize:9 }}>[{prov.source}]</span>}
                  </label>
                  <NumInput path={`nutrition_per_100g.amino_acids.${k}`} committed={draft.nutrition_per_100g.amino_acids?.[k]??0} step={0.001}/>
                </div>
              );
            })}
          </div>
        )}

        {tab === "source" && (
          <div>
            <div style={{ background:C.surface, borderRadius:8, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
              <div style={{ color:C.textDim, fontSize:11, fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:1 }}>Source Metadata</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                <div><span style={{ color:C.textDim }}>Provider:</span> <span style={{ color:C.text }}>{draft.source?.provider??"manual"}</span></div>
                <div><span style={{ color:C.textDim }}>FDC ID:</span> <span style={{ color:C.text }}>{draft.source?.fdcId??"—"}</span></div>
                <div><span style={{ color:C.textDim }}>Version:</span> <span style={{ color:C.text }}>{draft.source?.version??0}</span></div>
                <div>
                  <span style={{ color:C.textDim }}>Last synced:</span>{" "}
                  <span style={{ color:stale?C.gold:C.accent }}>
                    {lastSynced ? new Date(lastSynced).toLocaleDateString() : "Never"}
                    {stale && " ⚠"}
                  </span>
                </div>
              </div>
              {hasFdc ? (
                <button onClick={handleRefresh} disabled={refreshing}
                  style={{ ...btnStyle(C.blue), marginTop:12, fontSize:11, opacity:refreshing?0.6:1 }}>
                  {refreshing ? "Refreshing…" : "↻ Refresh from USDA + Enrichment"}
                </button>
              ) : (
                <div style={{ fontSize:10, color:C.textFaint, marginTop:8 }}>
                  No USDA FDC ID stored. Use the 🔍 USDA tab to import from FoodData Central.
                </div>
              )}
            </div>
            {draft.provenance && Object.keys(draft.provenance).length > 0 && (
              <div>
                <div style={{ color:C.textDim, fontSize:11, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Provenance</div>
                <div style={{ maxHeight:260, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
                  {Object.entries(draft.provenance).map(([path,{source:src,confidence}])=>(
                    <div key={path} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 8px", borderRadius:4, background:C.surface }}>
                      <span style={{ color:C.textDim, fontFamily:"monospace" }}>{path}</span>
                      <span style={{ color:confidence==="high"?C.accent:confidence==="medium"?C.gold:C.red }}>{src} · {confidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end", alignItems:"center" }}>
          {tab==="search" && !imported && <span style={{ fontSize:10, color:C.textFaint, marginRight:"auto" }}>Or skip USDA and fill tabs manually</span>}
          {hasFdc && tab!=="search" && tab!=="source" && (
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ ...btnStyle(C.surface2), fontSize:11, marginRight:"auto", opacity:refreshing?0.5:1 }}>
              {refreshing ? "↻ Refreshing…" : "↻ Refresh from source"}
            </button>
          )}
          <button onClick={onClose} style={btnStyle(C.surface2)}>Cancel</button>
          <button onClick={() => onSave(deepClone(draft))} style={btnStyle(C.accentDim)}>Save Food</button>
        </div>
      </div>
    </div>
  );
}
