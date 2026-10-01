// Storage API wrappers
// Thin async wrappers over localStorage that store JSON and never throw.

export async function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable or full: skip persisting */ }
}

export const deepClone = (obj) => structuredClone(obj);
