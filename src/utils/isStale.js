// Stale detection for cached food data

// True if lastSyncedAt is missing or older than `days` days (default 30).
export function isStale(lastSyncedAt, days = 30) {
  if (!lastSyncedAt) return true;
  return Date.now() - new Date(lastSyncedAt).getTime() > days * 86_400_000;
}
