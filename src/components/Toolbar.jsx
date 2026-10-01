import { C, R, SP, TYPE } from "../constants.js";

// Action bar with filters on the left and actions on the right.
export default function Toolbar({ title, children }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: R.card,
      padding: "18px 22px",
      marginBottom: SP.cardGapLg,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      {title && (
        <div style={TYPE.panelTitle}>
          {title}
        </div>
      )}
      <div style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}>
        {children}
      </div>
    </div>
  );
}
