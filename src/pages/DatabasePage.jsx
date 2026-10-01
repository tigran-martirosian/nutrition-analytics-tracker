import { useState, useEffect, useRef } from "react";
import { C, CATEGORY_COLORS, UNIT_LABELS, STATUS, BTN, TYPE, R } from "../constants.js";
import { NUTRIENT_META } from "../data/nutrientMeta.js";
import { AMINO_KEYS } from "../data/schema.js";
import { FOOD_AMOUNT_PRESETS } from "../data/foodPresets.js";
import { deepClone } from "../utils/storage.js";
import FoodEditModal from "../components/FoodEditModal.jsx";
import BulkUSDASync from "../components/BulkUSDASync.jsx";
import Toolbar from "../components/Toolbar.jsx";
import SummaryBar from "../components/SummaryBar.jsx";
import {
  PageShell, FilterChip,
  WarningBadge, EmptyState,
} from "../components/ui.jsx";

const DB_ROW_GRID = {
  gridTemplateColumns: "minmax(220px, 1fr) 72px 64px 72px 82px 34px",
};

// Table of all foods, grouped by category. Quantity and price can be edited in place,
// and warnings show for zero price, zero quantity or missing item weight.
export default function DatabasePage({
  foods, setFoods, updateFood, toggleFood, deleteFood,
  editingFood, setEditingFood,
  addingFood, setAddingFood,
  newFood, setNewFood,
  onSaveVersion,
  exportCSV, exportJSON, exportAmounts, importAmounts, importJSON, importCSV,
  resetToDefaults,
}) {
  const [filter, setFilter]               = useState("");
  const [catFilter, setCatFilter]         = useState("all");
  const [showInactive, setShowInactive]   = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [openRowMenu, setOpenRowMenu] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState("balanced");
  const exportRef = useRef(null);
  const importRef = useRef(null);

  const categories = ["all", "meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"];

  const filtered = foods.filter((f) => {
    const matchCat    = catFilter === "all" || f.category === catFilter;
    const matchText   = !filter || f.name.toLowerCase().includes(filter.toLowerCase());
    const matchActive = showInactive || f.enabled;
    return matchCat && matchText && matchActive;
  });

  const activeFoods = foods.filter((f) => f.enabled);
  const totalCost   = activeFoods.reduce((s, f) => s + f.price_per_unit * f.weekly_amount, 0);

  const categoryNames = {
    meat: "Meat", seafood: "Seafood", dairy_eggs: "Dairy & Eggs",
    grain: "Grain", vegetable: "Vegetable", fruit: "Fruit", other: "Other",
  };

  const groupedFoods = ["meat", "seafood", "dairy_eggs", "grain", "vegetable", "fruit", "other"]
    .map((cat) => ({
      category: cat,
      items: filtered.filter((f) => f.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  // Default template for a brand-new food
  const newFoodTemplate = () => ({
    id: `food_${Date.now()}`,
    name: "", category: "meat", quality: "",
    weekly_amount: 1, unit: "lb", item_weight_grams: null,
    price_per_unit: 0, enabled: true,
    nutrition_per_100g: {
      calories: 0, protein: 0, fat: 0, carbs: 0,
      omega3: 0, omega6: 0, creatine: 0, taurine: 0,
      vitamins:    Object.fromEntries(Object.keys(NUTRIENT_META.vitamins).map((k) => [k, 0])),
      minerals:    Object.fromEntries(Object.keys(NUTRIENT_META.minerals).map((k) => [k, 0])),
      fats:        Object.fromEntries(Object.keys(NUTRIENT_META.fats).map((k) => [k, 0])),
      amino_acids: Object.fromEntries(AMINO_KEYS.map((k) => [k, 0])),
    },
  });

  useEffect(() => {
    const closeMenus = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setShowExportMenu(false);
      if (importRef.current && !importRef.current.contains(event.target)) setShowImportMenu(false);
      setOpenRowMenu(null);
    };
    window.addEventListener("mousedown", closeMenus);
    return () => window.removeEventListener("mousedown", closeMenus);
  }, []);

  // Categories present in the data - used for chip counts
  const counts = foods.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});

  const applyFoodAmountPreset = () => {
    const preset = FOOD_AMOUNT_PRESETS[selectedPresetId];
    if (!preset) return;
    if (!window.confirm(`Apply ${preset.label} preset amounts? This will overwrite current quantities, prices, and enabled states for foods included in the preset.`)) {
      return;
    }

    const foodIds = new Set(foods.map((f) => f.id));
    Object.keys(preset.amounts).forEach((id) => {
      if (!foodIds.has(id)) console.warn(`Food preset "${preset.label}" skipped missing food id: ${id}`);
    });

    setFoods((prevFoods) =>
      prevFoods.map((food) => {
        const patch = preset.amounts[food.id];
        if (!patch) return food;
        return {
          ...food,
          weekly_amount: patch.weekly_amount,
          price_per_unit: patch.price_per_unit,
          enabled: patch.enabled,
        };
      }),
    );
  };

  return (
    <PageShell>
      <SummaryBar
        items={[
          { label: "Active Foods", value: activeFoods.length, color: STATUS.ok },
          { label: "Visible", value: filtered.length, color: C.text },
          { label: "Weekly Cost", value: `$${totalCost.toFixed(2)}`, color: STATUS.warn },
        ]}
      />

      <Toolbar>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search foods…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                color: C.text,
                padding: "9px 14px",
                borderRadius: R.input,
                ...TYPE.control,
                fontWeight: 500,
                width: 260,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                label={cat === "all" ? "all" : cat.replace("_", " ")}
                active={catFilter === cat}
                onClick={() => setCatFilter(cat)}
                accent={cat === "all" ? STATUS.ok : CATEGORY_COLORS[cat]}
                count={cat === "all" ? foods.length : counts[cat] || 0}
              />
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, ...TYPE.control, color: C.textDim, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={{ accentColor: STATUS.ok }}
            />
            Show inactive
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { setAddingFood(true); setNewFood(newFoodTemplate()); }}
            style={BTN.primary()}
          >
            + Add Food
          </button>

          <div style={{ width: 1, height: 24, background: C.border, margin: "0 4px" }} />

          <button onClick={onSaveVersion} style={BTN.secondary()}>💾 Snapshot</button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <label htmlFor="food-preset-select" style={{ ...TYPE.control, color: C.textDim }}>
              Preset:
            </label>
            <select
              id="food-preset-select"
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: R.input,
                color: C.text,
                padding: "8px 10px",
                ...TYPE.control,
              }}
            >
              {Object.entries(FOOD_AMOUNT_PRESETS).map(([id, preset]) => (
                <option key={id} value={id}>{preset.label}</option>
              ))}
            </select>
            <button onClick={applyFoodAmountPreset} style={BTN.secondary()}>
              Apply Preset
            </button>
          </div>

          <div ref={exportRef} style={{ position: "relative" }}>
            <button onClick={() => { setShowExportMenu(!showExportMenu); setShowImportMenu(false); }} style={BTN.secondary()}>Export ▾</button>
            {showExportMenu && (
              <DropdownMenu>
                <DropdownItem onClick={() => { exportCSV();     setShowExportMenu(false); }}>CSV</DropdownItem>
                <DropdownItem onClick={() => { exportJSON();    setShowExportMenu(false); }}>JSON</DropdownItem>
                <DropdownItem onClick={() => { exportAmounts(); setShowExportMenu(false); }}>Amounts</DropdownItem>
              </DropdownMenu>
            )}
          </div>

          <div ref={importRef} style={{ position: "relative" }}>
            <button onClick={() => { setShowImportMenu(!showImportMenu); setShowExportMenu(false); }} style={BTN.secondary()}>Import ▾</button>
            {showImportMenu && (
              <DropdownMenu>
                <DropdownItem onClick={() => { importAmounts(); setShowImportMenu(false); }}>Amounts</DropdownItem>
                <DropdownItem onClick={() => { importJSON();    setShowImportMenu(false); }}>JSON</DropdownItem>
                <DropdownItem onClick={() => { importCSV();     setShowImportMenu(false); }}>CSV</DropdownItem>
              </DropdownMenu>
            )}
          </div>

          <BulkUSDASync foods={foods} onSyncComplete={setFoods} />

          <button onClick={resetToDefaults} style={BTN.destructive()}>↺ Reset</button>
        </div>
      </Toolbar>

      {addingFood && newFood && (
        <FoodEditModal
          food={newFood}
          onSave={(f) => { setFoods((prev) => [...prev, f]); setAddingFood(false); setNewFood(null); }}
          onClose={() => { setAddingFood(false); setNewFood(null); }}
        />
      )}
      {editingFood && (
        <FoodEditModal
          food={editingFood}
          onSave={(f) => { setFoods((prev) => prev.map((x) => (x.id === f.id ? f : x))); setEditingFood(null); }}
          onClose={() => setEditingFood(null)}
        />
      )}

      <div className="database-category-masonry">
        {groupedFoods.map((group) => {
          const catColor = CATEGORY_COLORS[group.category] || C.textDim;
          const groupCost = group.items.reduce((s, f) => s + (f.enabled ? f.price_per_unit * f.weekly_amount : 0), 0);
          const groupActive = group.items.filter((f) => f.enabled).length;

          return (
            <div
              key={group.category}
              className="database-category-card"
              style={{ "--category-color": catColor }}
            >
              <div className="database-category-header">
                <div className="database-category-title">
                  <span className="database-category-dot" />
                  <span>{categoryNames[group.category]}</span>
                  <span className="database-category-count">{group.items.length} {group.items.length === 1 ? "item" : "items"}</span>
                </div>
                <div className="database-category-stats">
                  <span><strong>{groupActive}</strong> active</span>
                  <span><strong>${groupCost.toFixed(2)}</strong> /wk</span>
                </div>
              </div>

              <div className="database-grid-header" style={DB_ROW_GRID}>
                <div>Food</div>
                <div className="database-cell-num database-qty-cell">Qty</div>
                <div className="database-cell-unit database-unit-cell">Unit</div>
                <div className="database-cell-num">Price</div>
                <div className="database-cell-num">$/wk</div>
                <div className="database-cell-actions">{"\u22ef"}</div>
              </div>

              <div className="database-row-list">
                {group.items.map((f) => {
                  const missingWeight = (f.unit === "each" || f.unit === "count") && (!f.item_weight_grams || f.item_weight_grams <= 0);
                  const zeroPrice     = f.enabled && f.price_per_unit <= 0;
                  const zeroQty       = f.enabled && f.weekly_amount <= 0;
                  const weeklyCost    = f.price_per_unit * f.weekly_amount;
                  const unitLabel     = UNIT_LABELS[f.unit] || f.unit;

                  return (
                    <FoodRow
                      key={f.id}
                      food={f}
                      catColor={catColor}
                      unitLabel={unitLabel}
                      weeklyCost={weeklyCost}
                      warnings={{ missingWeight, zeroPrice, zeroQty }}
                      menuOpen={openRowMenu === f.id}
                      onToggleMenu={() => setOpenRowMenu((current) => current === f.id ? null : f.id)}
                      onToggleEnabled={() => { toggleFood(f.id); setOpenRowMenu(null); }}
                      onEdit={() => { setEditingFood(deepClone(f)); setOpenRowMenu(null); }}
                      onDelete={() => { deleteFood(f.id, f.name); setOpenRowMenu(null); }}
                      onUpdate={updateFood}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState title="No foods match your filters" hint="Try clearing the search or selecting a different category." />
      )}
    </PageShell>
  );
}

function FoodRow({
  food: f, catColor, unitLabel, weeklyCost, warnings,
  menuOpen, onToggleMenu, onToggleEnabled, onEdit, onDelete, onUpdate,
}) {
  // Fade rows that are enabled but have qty or price 0, so they read as active but not counted yet.
  const inactiveLook   = !f.enabled;
  const ghostedLook    = f.enabled && (warnings.zeroQty || warnings.missingWeight);
  const rowOpacity     = inactiveLook ? 0.55 : ghostedLook ? 0.78 : 1;
  const subtitle = f.quality || f.notes || "";

  return (
    <div
      className="database-grid-row"
      style={{ ...DB_ROW_GRID, opacity: rowOpacity }}
    >
      <div className="database-food-cell">
        <div className="database-food-main">
          <span className="database-food-dot" style={{ background: catColor }} />
          <div className="database-food-copy">
            <div className="database-food-name">{f.name}</div>
            {subtitle && (
              <div className="database-food-meta">{subtitle}</div>
            )}
          </div>
        </div>
        <div className="database-warning-row">
          {warnings.missingWeight && <WarningBadge text="missing item weight" />}
          {warnings.zeroPrice     && <WarningBadge text="no price" />}
          {warnings.zeroQty       && <WarningBadge text="qty 0" />}
        </div>
      </div>

      <div className="database-cell-num database-qty-cell">
        <CompactNumberCell
          value={f.weekly_amount}
          onChange={(v) => onUpdate(f.id, "weekly_amount", parseFloat(v) || 0)}
          step={0.1}
          renderPreview={(draft) => <QuantityDeltaPreview food={f} draft={draft} />}
        />
      </div>

      <div className="database-cell-unit database-unit-cell">{unitLabel}</div>

      <div className="database-cell-num">
        <CompactNumberCell
          value={f.price_per_unit}
          onChange={(v) => onUpdate(f.id, "price_per_unit", parseFloat(v) || 0)}
          step={0.01}
        />
      </div>

      <div className="database-cell-num database-weekly-cost">${weeklyCost.toFixed(2)}</div>

      <div className="database-cell-actions">
        <div className="database-row-menu-wrap" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <button
            className="database-row-menu-button"
            onClick={onToggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Actions for ${f.name}`}
          >
            {"\u22ef"}
          </button>
          {menuOpen && (
            <div className="database-row-menu" role="menu">
              <button role="menuitem" onClick={onEdit}>Edit</button>
              <button role="menuitem" onClick={onToggleEnabled}>{f.enabled ? "Toggle inactive" : "Toggle active"}</button>
              <button role="menuitem" className="danger" onClick={onDelete}>Delete</button>
            </div>
          )}
          </div>
      </div>
    </div>
  );
}

function CompactNumberCell({ value, onChange, step, renderPreview }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => { setDraft(value); setEditing(true); };
  const commit = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  const display = Number(value).toFixed(step >= 1 ? 0 : 2);

  if (editing) {
    return (
      <div className="database-edit-wrap">
        <input
          className="database-number-input"
          type="number"
          min={0}
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
        />
        {renderPreview?.(draft)}
      </div>
    );
  }

  return (
    <button className="database-number-button" onClick={startEdit}>
      {display}
    </button>
  );
}

function QuantityDeltaPreview({ food, draft }) {
  const nextAmount = Number(draft);
  if (!Number.isFinite(nextAmount)) return null;
  const delta = food.price_per_unit * nextAmount - food.price_per_unit * food.weekly_amount;
  if (Math.abs(delta) < 0.005) return null;
  return <div style={{ color: STATUS.ok, ...TYPE.sourceCode, fontSize: 10.5 }}>cost ${fmtDelta(delta, 2)}/wk</div>;
}
function fmtDelta(value, decimals) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

function DropdownMenu({ children }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 6px)", left: 0,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: R.btn, padding: 4,
      display: "flex", flexDirection: "column", gap: 2,
      zIndex: 100, minWidth: 140,
      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
    }}>
      {children}
    </div>
  );
}

function DropdownItem({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent", border: "none",
        textAlign: "left", padding: "8px 12px", borderRadius: R.btnSm,
        color: C.text, cursor: "pointer", ...TYPE.control,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = C.surface2}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      {children}
    </button>
  );
}

