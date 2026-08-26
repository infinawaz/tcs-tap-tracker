/**
 * utils.js – Shared helper functions (date/time, formatting, haptics, toast).
 */

/* ── Time & Date ─────────────────────────────────────────────────── */

/**
 * Returns the current time as "HH:MM:SS AM/PM".
 * @param {Date} [d]
 */
export function formatTimeAmPm(d = new Date()) {
  let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m)}:${pad(s)} ${ampm}`;
}

/**
 * Returns "YYYY-MM-DD" for a given date.
 * @param {Date} [d]
 */
export function formatDateISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns "Wednesday, 27 August 2026" style string.
 * @param {Date} [d]
 */
export function formatDateLong(d = new Date()) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/**
 * Returns elapsed seconds between two dates.
 * @param {Date|string} from
 * @param {Date} [to]
 */
export function elapsedSeconds(from, to = new Date()) {
  const f = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((to - f) / 1000));
}

/**
 * Formats seconds into "HH:MM:SS".
 * @param {number} totalSeconds
 */
export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Formats seconds into "X hrs Y mins" (for API payload).
 * @param {number} totalSeconds
 */
export function formatTotalHours(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} mins`;
  return `${h} hrs ${m} mins`;
}

/** @param {number} n */
function pad(n) { return String(n).padStart(2, '0'); }

/** Time-of-day greeting */
export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

/* ── Haptics ─────────────────────────────────────────────────────── */

export function haptic(ms = 100) {
  try { navigator.vibrate?.(ms); } catch { /* non-fatal */ }
}

/* ── Toast Notifications ─────────────────────────────────────────── */

const TOAST_DURATION = 3000; // ms

/**
 * Shows a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const icon = { success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ';
  toast.innerHTML = `<strong>${icon}</strong> ${escHtml(message)}`;
  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, TOAST_DURATION);
}

/* ── Avatar Initials ─────────────────────────────────────────────── */

/**
 * Returns one or two uppercase initials from a name string.
 * @param {string} name
 */
export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

/* ── Sanitise ────────────────────────────────────────────────────── */
function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
