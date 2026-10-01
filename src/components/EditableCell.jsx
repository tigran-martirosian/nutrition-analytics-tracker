import { useState } from "react";
import { C, TYPE, R, STATUS } from "../constants.js";

// Click-to-edit input used in the Food DB and Planner tables.
export default function EditableCell({
  value,
  onChange,
  type = "text",
  min,
  step = 0.01,
  width = 90,
  align = "right",
  renderPreview,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => { setDraft(value); setEditing(true); };
  const commit    = () => { onChange(draft); setEditing(false); };
  const cancel    = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : "flex-start", gap: 5 }}>
        <input
          type={type}
          min={min}
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          style={{
            width,
            background: C.bg,
            border: `1px solid ${STATUS.ok}`,
            color: C.text,
            padding: "10px 14px",
            borderRadius: R.input,
            ...TYPE.dbNumber,
            textAlign: align,
            outline: "none",
            boxShadow: `0 0 0 3px ${STATUS.ok}33`,
            boxSizing: "border-box",
          }}
        />
        {renderPreview?.(draft)}
      </div>
    );
  }

  const display = type === "number" ? Number(value).toFixed(step >= 1 ? 0 : 2) : value;

  return (
    <button
      onClick={startEdit}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        minWidth: width,
        padding: "10px 14px",
        borderRadius: R.input,
        border: `1px solid transparent`,
        background: "transparent",
        color: C.text,
        cursor: "text",
        transition: "background 0.12s, border-color 0.12s",
        ...TYPE.dbNumber,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = C.bg;
        e.currentTarget.style.borderColor = C.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {display}
    </button>
  );
}
