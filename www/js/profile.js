/**
 * profile.js – Profile tab: user info display, stats, change PIN, logout.
 */

import { apiChangePin, apiGetMonthHistory } from './api.js';
import { saveUser, clearHistoryCache } from './store.js';
import {
  formatMonthKey, parseTotalHoursToSecs, showToast, initials,
} from './utils.js';

export function initProfile({ user, onLogout, onPinChanged }) {
  /* ── DOM refs ─────────────────────────────────────────────── */
  const profileAvatar    = document.getElementById('profile-avatar');
  const profileName      = document.getElementById('profile-name');
  const profileRole      = document.getElementById('profile-role');
  const profileId        = document.getElementById('profile-id');
  const profileMonthHrs  = document.getElementById('profile-month-hours');
  const profileMonthDays = document.getElementById('profile-month-days');
  const profileSessions  = document.getElementById('profile-sessions');
  const profileAvgHours  = document.getElementById('profile-avg-hours');

  const btnChangePin     = document.getElementById('btn-change-pin');
  const changePinForm    = document.getElementById('change-pin-form');
  const btnSavePin       = document.getElementById('btn-save-pin');
  const btnCancelPin     = document.getElementById('btn-cancel-pin');
  const cpOld            = document.getElementById('cp-old');
  const cpNew            = document.getElementById('cp-new');
  const cpConfirm        = document.getElementById('cp-confirm');
  const cpErrOld         = document.getElementById('cp-error-old');
  const cpErrNew         = document.getElementById('cp-error-new');
  const cpErrConfirm     = document.getElementById('cp-error-confirm');
  const cpErrBanner      = document.getElementById('cp-error-banner');
  const cpErrText        = document.getElementById('cp-error-text');

  const btnProfileLogout = document.getElementById('btn-profile-logout');

  /* ── Render profile ──────────────────────────────────────── */
  profileAvatar.textContent = initials(user.name);
  profileName.textContent   = user.name;
  profileRole.textContent   = user.role || 'Associate';
  profileId.textContent     = user.id;

  /* ── Load stats ──────────────────────────────────────────── */
  let hasLoaded = false;

  function onTabActivate() {
    if (!hasLoaded) {
      hasLoaded = true;
      loadProfileStats();
    }
  }

  async function loadProfileStats() {
    try {
      const month = formatMonthKey();
      const res   = await apiGetMonthHistory(user.id, user.pin, month);
      if (!res?.success) return;
      const records = Array.isArray(res.records) ? res.records : [];

      const uniqueDates = new Set();
      let totalSecs = 0;
      records.forEach(r => {
        const date  = r['Date'] || r.date || '';
        const dSecs = parseInt(r['Duration (secs)'] || r.durationSecs || 0, 10)
                    || parseTotalHoursToSecs(r['Total Hours'] || r.totalHours || '');
        if (date) uniqueDates.add(date);
        totalSecs += dSecs;
      });

      const daysPresent   = uniqueDates.size;
      const totalHrs      = (totalSecs / 3600).toFixed(1);
      const sessionsCount = records.length;
      const avgHrs        = daysPresent > 0 ? (totalSecs / 3600 / daysPresent).toFixed(1) : '0';

      profileMonthHrs.textContent  = `${totalHrs}h`;
      profileMonthDays.textContent = daysPresent;
      profileSessions.textContent  = sessionsCount;
      profileAvgHours.textContent  = `${avgHrs}h`;
    } catch (e) {
      // Non-fatal
    }
  }

  /* ── Change PIN toggle ───────────────────────────────────── */
  btnChangePin.addEventListener('click', () => {
    const isOpen = !changePinForm.classList.contains('hidden');
    changePinForm.classList.toggle('hidden', isOpen);
    if (!isOpen) { cpOld.focus(); }
  });

  btnCancelPin.addEventListener('click', () => {
    changePinForm.classList.add('hidden');
    cpOld.value = cpNew.value = cpConfirm.value = '';
    clearPinErrors();
  });

  /* ── PIN numeric enforcement ─────────────────────────────── */
  [cpOld, cpNew, cpConfirm].forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
    });
  });

  /* ── Save PIN ────────────────────────────────────────────── */
  btnSavePin.addEventListener('click', async () => {
    clearPinErrors();
    const oldPin     = cpOld.value.trim();
    const newPin     = cpNew.value.trim();
    const confirmPin = cpConfirm.value.trim();

    let valid = true;
    if (!oldPin || oldPin.length !== 4) { cpErrOld.textContent = 'Enter your current 4-digit PIN.'; valid = false; }
    if (!newPin || newPin.length !== 4) { cpErrNew.textContent = 'New PIN must be 4 digits.'; valid = false; }
    if (newPin !== confirmPin)          { cpErrConfirm.textContent = 'PINs do not match.'; valid = false; }
    if (!valid) return;

    const label   = btnSavePin.querySelector('.btn-label');
    const spinner = btnSavePin.querySelector('.btn-spinner');
    btnSavePin.disabled = true;
    label.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
      const res = await apiChangePin(user.id, oldPin, newPin);
      if (res?.success === true) {
        // Update stored user with new PIN
        const updatedUser = { ...user, pin: newPin };
        saveUser(updatedUser);
        clearHistoryCache();
        changePinForm.classList.add('hidden');
        cpOld.value = cpNew.value = cpConfirm.value = '';
        showToast('PIN changed successfully ✓', 'success');
        if (onPinChanged) onPinChanged(updatedUser);
      } else {
        showPinError(res?.message || 'Failed to change PIN.');
      }
    } catch (err) {
      showPinError(err.message || 'Network error. Try again.');
    } finally {
      btnSavePin.disabled = false;
      label.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  });

  /* ── Logout ──────────────────────────────────────────────── */
  btnProfileLogout.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) onLogout();
  });

  /* ── Helpers ─────────────────────────────────────────────── */
  function showPinError(msg) {
    cpErrText.textContent = msg;
    cpErrBanner.classList.remove('hidden');
  }

  function clearPinErrors() {
    cpErrOld.textContent = cpErrNew.textContent = cpErrConfirm.textContent = '';
    cpErrBanner.classList.add('hidden');
  }

  return { onTabActivate };
}
