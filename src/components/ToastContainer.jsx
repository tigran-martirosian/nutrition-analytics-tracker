import { C, FONT } from "../constants.js";

// Shows the toast stack in the bottom-right corner.
export default function ToastContainer({ toasts }) {
  const typeColor = {
    info:    C.teal,
    success: C.accent,
    error:   C.red,
    warn:    C.orange,
  };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: C.surface,
            border: `1px solid ${typeColor[t.type] || "#333"}`,
            borderLeft: `3px solid ${typeColor[t.type] || "#555"}`,
            color: C.text,
            padding: "10px 16px",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: FONT.ui,
            maxWidth: 320,
            animation: "slideIn 0.2s ease",
          }}
        >
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
