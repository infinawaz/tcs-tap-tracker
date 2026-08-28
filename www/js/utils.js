/**
 * utils.js v2.0 – Shared helper functions.
 */

/* ── Time & Date ─────────────────────────────────────────────── */

export function formatTimeAmPm(d = new Date()) {
  let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m)}:${pad(s)} ${ampm}`;
}

export function formatDateISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateLong(d = new Date()) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatDateShort(d = new Date()) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Returns "YYYYMM" for a given date.
 */
export function formatMonthKey(d = new Date()) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
}

/**
 * Converts "YYYYMM" → "August 2026"
 */
export function formatMonthLabel(yyyymm) {
  if (!yyyymm || yyyymm.length < 6) return yyyymm;
  const y = parseInt(yyyymm.slice(0, 4), 10);
  const m = parseInt(yyyymm.slice(4, 6), 10) - 1;
  return new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Returns last N months as YYYYMM strings, newest first.
 */
export function lastNMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(formatMonthKey(d));
  }
  return months;
}

export function elapsedSeconds(from, to = new Date()) {
  const f = from instanceof Date ? from : new Date(from);
  return Math.max(0, Math.floor((to - f) / 1000));
}

export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatTotalHours(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} mins`;
  return `${h} hrs ${m} mins`;
}

/**
 * Parses "X hrs Y mins" or "Y mins" string into total seconds.
 */
export function parseTotalHoursToSecs(str) {
  if (!str) return 0;
  let secs = 0;
  const hMatch = str.match(/(\d+)\s*hr/i);
  const mMatch = str.match(/(\d+)\s*min/i);
  if (hMatch) secs += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) secs += parseInt(mMatch[1], 10) * 60;
  return secs;
}

function pad(n) { return String(n).padStart(2, '0'); }

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

/* ── Days of week helpers ─────────────────────────────────────── */

/** Returns Mon-Sun short labels for the current week */
export function currentWeekDays() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  // Shift so week starts Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      dateISO:  formatDateISO(d),
      label:    d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2),
      isToday:  formatDateISO(d) === formatDateISO(now),
    });
  }
  return days;
}

/* ── Haptics ─────────────────────────────────────────────────── */

export function haptic(ms = 100) {
  try { navigator.vibrate?.(ms); } catch { /* non-fatal */ }
}

/* ── Toast ───────────────────────────────────────────────────── */

const TOAST_DURATION = 3200;

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
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, TOAST_DURATION);
}

/* ── Avatar Initials ─────────────────────────────────────────── */

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

/* ── CSV Export ──────────────────────────────────────────────── */

/**
 * Triggers a browser download for a CSV string.
 * @param {string} csvString
 * @param {string} filename
 */
export function downloadCsvFile(csvString, filename) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

/* ── Sanitise ────────────────────────────────────────────────── */

export function escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
