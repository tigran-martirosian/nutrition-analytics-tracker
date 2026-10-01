import { useState, useCallback } from "react";

// Toast notification state. Auto-dismisses after 3.2s.
// Exports: toasts array, addToast(msg, type). Type: info | success | error | warn
export default function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3200,
    );
  }, []);

  return { toasts, addToast };
}
