import { useState, useCallback } from "react";

// Keeps typed-in values separate from saved state so number inputs do not jump around.
// Used in DatabasePage, PlannerPage and FoodEditModal.
export default function useNumericDraft() {
  const [drafts, setDrafts] = useState({});

  const getDraft = useCallback(
    (key, committed) => (key in drafts ? drafts[key] : String(committed ?? "")),
    [drafts],
  );

  const setDraft = useCallback(
    (key, raw) => setDrafts((prev) => ({ ...prev, [key]: raw })),
    [],
  );

  const commitDraft = useCallback(
    (key, onCommit) => {
      if (!(key in drafts)) return;
      const parsed = parseFloat(drafts[key]);
      const committed = isNaN(parsed) ? 0 : Math.max(0, parsed);
      setDrafts((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      onCommit(committed);
    },
    [drafts],
  );

  return { getDraft, setDraft, commitDraft };
}
