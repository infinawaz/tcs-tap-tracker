/**
 * store.js v2.0 – localStorage persistence layer.
 * Centralises all read/write of app state.
 */

const KEYS = {
  USER:          'tcs_user',
  TAP_STATE:     'tcs_tap_state',
  OFFLINE_QUEUE: 'tcs_offline_queue',
  HISTORY_CACHE: 'tcs_history_cache',
};

/* ── User Profile ─────────────────────────────────────────────── */

export function getUser() {
  try { const r = localStorage.getItem(KEYS.USER); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

export function saveUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(KEYS.USER);
}

/* ── Tap State ────────────────────────────────────────────────── */

export function getTapState() {
  try { const r = localStorage.getItem(KEYS.TAP_STATE); return r ? JSON.parse(r) : defaultTapState(); }
  catch { return defaultTapState(); }
}

function defaultTapState() {
  return { tappedIn: false, tapInTimestamp: null, tapInDisplay: null };
}

export function saveTapState(state) {
  localStorage.setItem(KEYS.TAP_STATE, JSON.stringify(state));
}

export function clearTapState() {
  localStorage.removeItem(KEYS.TAP_STATE);
}

/* ── Offline Queue ────────────────────────────────────────────── */

/**
 * Each item: { associateId, pin, date, tapIn, tapOut, totalHours, durationSecs, enqueuedAt }
 * @returns {Array}
 */
export function getOfflineQueue() {
  try { const r = localStorage.getItem(KEYS.OFFLINE_QUEUE); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export function enqueueOffline(item) {
  const q = getOfflineQueue();
  q.push({ ...item, enqueuedAt: new Date().toISOString() });
  localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(q));
}

export function dequeueOffline(index) {
  const q = getOfflineQueue();
  q.splice(index, 1);
  localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(q));
}

export function clearOfflineQueue() {
  localStorage.removeItem(KEYS.OFFLINE_QUEUE);
}

/* ── History Cache ────────────────────────────────────────────── */

/**
 * cache = { [associateId_YYYYMM]: { records: [], fetchedAt: ISO } }
 */
function getHistoryCache() {
  try { const r = localStorage.getItem(KEYS.HISTORY_CACHE); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

export function getCachedHistory(associateId, month) {
  const cache = getHistoryCache();
  const key = `${associateId}_${month}`;
  const entry = cache[key];
  if (!entry) return null;
  // Invalidate after 5 minutes
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  if (age > 5 * 60 * 1000) return null;
  return entry.records;
}

export function setCachedHistory(associateId, month, records) {
  const cache = getHistoryCache();
  cache[`${associateId}_${month}`] = { records, fetchedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.HISTORY_CACHE, JSON.stringify(cache));
}

export function clearHistoryCache() {
  localStorage.removeItem(KEYS.HISTORY_CACHE);
}
