/**
 * api.js – All network communication with the Google Apps Script backend.
 * Every request is a POST with a JSON body.
 */

const BASE_URL =
  'https://script.google.com/macros/s/AKfycbwNuzQyg1FJt8Zwp6eKeopZgmUv50Vhhi-E_OjuCWAHszIyxo6WkyYq8q_L6XmrajIk/exec';

/**
 * Core POST helper.
 * @param {object} payload – JSON body to send.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function post(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000); // 20 s timeout

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      // GAS CORS: content-type text/plain avoids preflight for simple POST
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      // Some GAS scripts return plain text on error
      throw new Error(text || 'Unexpected server response.');
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
    throw err;
  }
}

/**
 * Login – authenticates user credentials.
 * @param {string} associateId
 * @param {string} pin
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export async function apiLogin(associateId, pin) {
  return post({ action: 'login', associateId, pin });
}

/**
 * Log attendance – sends a completed shift record.
 * @param {object} params
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function apiLogAttendance({ associateId, pin, date, tapIn, tapOut, totalHours }) {
  return post({ action: 'logAttendance', associateId, pin, date, tapIn, tapOut, totalHours });
}

/**
 * Register – creates a new associate account.
 * @param {object} params
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function apiRegister({ associateId, name, pin, role }) {
  return post({ action: 'register', associateId, name, pin, role });
}

/**
 * Get personal history – fetches past attendance records.
 * @param {string} associateId
 * @param {string} pin
 * @returns {Promise<{success: boolean, records?: Array, message?: string}>}
 */
export async function apiGetHistory(associateId, pin) {
  return post({ action: 'getHistory', associateId, pin });
}
