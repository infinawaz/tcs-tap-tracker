/**
 * store.js – localStorage persistence layer.
 * Centralises all read/write of app state so it never gets scattered.
 */

const KEYS = {
  USER:     'tcs_user',
  TAP_STATE: 'tcs_tap_state',
};

/* ── User Profile ────────────────────────────────────────────────── */

/** @returns {{ id: string, name: string, role: string, pin: string } | null} */
export function getUser() {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** @param {{ id: string, name: string, role: string, pin: string }} user */
export function saveUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(KEYS.USER);
}

/* ── Tap State ───────────────────────────────────────────────────── */

/**
 * @typedef {Object} TapState
 * @property {boolean} tappedIn
 * @property {string|null} tapInTimestamp   – ISO string of tap-in moment
 * @property {string|null} tapInDisplay     – "HH:MM:SS AM/PM" for API payload
 */

/** @returns {TapState} */
export function getTapState() {
  try {
    const raw = localStorage.getItem(KEYS.TAP_STATE);
    return raw ? JSON.parse(raw) : defaultTapState();
  } catch { return defaultTapState(); }
}

function defaultTapState() {
  return { tappedIn: false, tapInTimestamp: null, tapInDisplay: null };
}

/** @param {TapState} state */
export function saveTapState(state) {
  localStorage.setItem(KEYS.TAP_STATE, JSON.stringify(state));
}

export function clearTapState() {
  localStorage.removeItem(KEYS.TAP_STATE);
}
