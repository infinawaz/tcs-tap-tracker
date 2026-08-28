/**
 * api.js v2.0 – All network communication with the Google Apps Script backend.
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbzJSSQDG5egvEspsYrPRqYfxfJRaTEff7VjcCqg9VfydsbIHoT2hWnsXP2eEGWJmGgN/exec';

/**
 * Core POST helper with 20s timeout.
 */
async function post(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoid preflight
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const text = await response.text();
    try { return JSON.parse(text); }
    catch { throw new Error(text || 'Unexpected server response.'); }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw err;
  }
}

/* ── Auth ────────────────────────────────────────────────────── */

export async function apiLogin(associateId, pin) {
  return post({ action: 'login', associateId, pin });
}

export async function apiRegister({ associateId, name, pin, role }) {
  return post({ action: 'register', associateId, name, pin, role });
}

/* ── Attendance ──────────────────────────────────────────────── */

export async function apiLogAttendance({ associateId, pin, date, tapIn, tapOut, totalHours, durationSecs }) {
  return post({ action: 'logAttendance', associateId, pin, date, tapIn, tapOut, totalHours, durationSecs });
}

/* ── History ─────────────────────────────────────────────────── */

/**
 * Fetches the current month's history for the logged-in associate.
 */
export async function apiGetHistory(associateId, pin) {
  return post({ action: 'getHistory', associateId, pin });
}

/**
 * Fetches a specific month's history. month = "YYYYMM"
 */
export async function apiGetMonthHistory(associateId, pin, month) {
  return post({ action: 'getMonthHistory', associateId, pin, month });
}

/**
 * Returns CSV text for a given month.
 */
export async function apiDownloadMonth(associateId, pin, month) {
  return post({ action: 'downloadMonth', associateId, pin, month });
}

/* ── Profile ─────────────────────────────────────────────────── */

export async function apiChangePin(associateId, oldPin, newPin) {
  return post({ action: 'changePin', associateId, oldPin, newPin });
}

/* ── Admin ───────────────────────────────────────────────────── */

export async function apiAdminGetAssociates(adminId, pin) {
  return post({ action: 'adminGetAssociates', associateId: adminId, pin });
}

export async function apiAdminGetAssociateMonth(adminId, pin, targetId, month) {
  return post({ action: 'adminGetAssociateMonth', associateId: adminId, pin, targetId, month });
}

export async function apiAdminExportAll(adminId, pin, month) {
  return post({ action: 'adminExportAll', associateId: adminId, pin, month });
}
