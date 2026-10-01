import { useState } from "react";
import { C, FONT } from "../constants.js";

// Stacked macro bar with a hover tooltip that follows the mouse and stays inside the bar.
// Prop macroData: array of { name, pct, grams, color }
export default function MacroStackedBar({ macroData }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const x = Math.max(80, Math.min(mouseX, rect.width - 80));
    setTooltip({ x, y: mouseY });
  };

  return (
    <div style={{ position: "relative", marginBottom: 6 }}>
      <div
        style={{ display: "flex", height: 14, borderRadius: 3, overflow: "hidden" }}
        onMouseLeave={() => setHovered(null)}
        onMouseMove={handleMouseMove}
      >
        {macroData.map((m) => (
          <div
            key={m.name}
            style={{ width: `${m.pct}%`, background: m.color, cursor: "default" }}
            onMouseEnter={() => setHovered(m)}
          />
        ))}
      </div>
      {hovered && (
        <div style={{
          position: "absolute",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -120%)",
          background: C.bg,
          border: "1px solid " + C.border,
          borderRadius: 6,
          padding: "8px 12px",
          pointerEvents: "none",
          zIndex: 100,
          whiteSpace: "nowrap",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
        }}>
          <span style={{ color: hovered.color, fontFamily: FONT.ui, fontWeight: 700, fontSize: 14 }}>
            {hovered.name}
          </span>
          <span style={{ color: C.textDim, fontFamily: FONT.ui, fontSize: 13, marginLeft: 4 }}>
            — {hovered.pct}% · {hovered.grams}g
          </span>
        </div>
      )}
    </div>
  );
}
