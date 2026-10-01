import { CATEGORY_COLORS, C } from "../constants.js";

// Small colour marker for a food category.
export default function CategoryDot({ category, size = 10 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size > 8 ? 3 : 2,
        background: CATEGORY_COLORS[category] || C.textDim,
        flexShrink: 0,
      }}
    />
  );
}
