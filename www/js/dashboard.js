/**
 * dashboard.js – Dashboard screen: tap button, elapsed timer,
 *                progress ring, bottom sheet, and confirmation modal.
 */

import { apiLogAttendance, apiGetHistory } from './api.js';
import { getTapState, saveTapState, clearTapState } from './store.js';
import {
  formatTimeAmPm, formatDateISO, formatDateLong,
  elapsedSeconds, formatElapsed, formatTotalHours,
  haptic, showToast, greeting, initials,
} from './utils.js';

// 9-hour target in seconds
const SHIFT_TARGET_SECS = 9 * 3600;
// Progress ring circumference for r=100
const RING_CIRCUMFERENCE = 2 * Math.PI * 100; // ≈ 628.3

let elapsedTimer = null;    // setInterval handle
let clockTimer   = null;    // live-clock interval

export function initDashboard({ user, onLogout }) {
  /* ── DOM refs ──────────────────────────────────────────────────── */
  const tapBtn           = document.getElementById('tap-btn');
  const tapBtnLabel      = document.getElementById('tap-btn-label');
  const statusPill       = document.getElementById('status-pill');
  const statusDot        = document.getElementById('status-dot');
  const statusLabel      = document.querySelector('#status-pill span:last-child');
  const elapsedPanel     = document.getElementById('elapsed-panel');
  const elapsedTimeEl    = document.getElementById('elapsed-time');
  const tappedInSinceEl  = document.getElementById('tapped-in-since');
  const ringFill         = document.getElementById('ring-fill');
  const liveDateEl       = document.getElementById('live-date');
  const liveClockEl      = document.getElementById('live-clock');
  const timeGreetingEl   = document.getElementById('time-greeting');
  const userNameEl       = document.getElementById('user-name-display');
  const userAvatarEl     = document.getElementById('user-avatar');
  const statDateEl       = document.getElementById('stat-date');
  const statLastShiftEl  = document.getElementById('stat-last-shift');
  const btnLogout        = document.getElementById('btn-logout');

  // Bottom sheet
  const bottomSheet      = document.getElementById('bottom-sheet');
  const sheetBackdrop    = document.getElementById('sheet-backdrop');
  const sheetFab         = document.getElementById('sheet-fab');
  const sheetHandle      = document.getElementById('sheet-handle');
  const btnRefresh       = document.getElementById('btn-refresh-history');
  const historyList      = document.getElementById('history-list');
  const historyEmpty     = document.getElementById('history-empty');
  const historyLoading   = document.getElementById('history-loading');
  const historyError     = document.getElementById('history-error');
  const historyErrorText = document.getElementById('history-error-text');

  // Modal
  const modalOverlay  = document.getElementById('modal-overlay');
  const modalDuration = document.getElementById('modal-duration');
  const modalCancel   = document.getElementById('modal-cancel');
  const modalConfirm  = document.getElementById('modal-confirm');
  const modalError    = document.getElementById('modal-error');

  /* ── Populate user info ────────────────────────────────────────── */
  userNameEl.textContent    = user.name;
  userAvatarEl.textContent  = initials(user.name);
  timeGreetingEl.textContent = greeting();
  statDateEl.textContent    = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  /* ── Live clock & date ─────────────────────────────────────────── */
  function updateClock() {
    const now = new Date();
    liveDateEl.textContent  = formatDateLong(now);
    liveClockEl.textContent = formatTimeAmPm(now);
    timeGreetingEl.textContent = greeting();
  }
  updateClock();
  clockTimer = setInterval(updateClock, 1000);

  /* ── Restore persisted tap state ───────────────────────────────── */
  let tapState = getTapState();
  if (tapState.tappedIn) {
    applyTappedInUI(tapState.tapInTimestamp);
    startElapsedTimer(tapState.tapInTimestamp);
  } else {
    applyTappedOutUI();
  }

  /* ── Tap button click ──────────────────────────────────────────── */
  tapBtn.addEventListener('click', () => {
    haptic(100);
    tapState = getTapState();

    if (!tapState.tappedIn) {
      // TAP IN
      const now          = new Date();
      const tapInDisplay = formatTimeAmPm(now);
      const newState     = { tappedIn: true, tapInTimestamp: now.toISOString(), tapInDisplay };
      saveTapState(newState);
      tapState = newState;
      applyTappedInUI(now.toISOString());
      startElapsedTimer(now.toISOString());
      showToast('Shift started! Have a great day 👋', 'success');
    } else {
      // TAP OUT → open confirmation modal
      showConfirmModal();
    }
  });

  /* ── UI helpers ────────────────────────────────────────────────── */
  function applyTappedInUI(tapInTimestamp) {
    tapBtn.classList.add('tapped-in');
    tapBtnLabel.textContent = 'TAP OUT';
    statusPill.classList.add('active');
    statusLabel.textContent = 'Tapped In';
    elapsedPanel.classList.add('visible');

    const d = new Date(tapInTimestamp);
    tappedInSinceEl.textContent = `Since ${formatTimeAmPm(d)}`;
  }

  function applyTappedOutUI() {
    tapBtn.classList.remove('tapped-in');
    tapBtnLabel.textContent = 'TAP IN';
    statusPill.classList.remove('active');
    statusLabel.textContent = 'Tapped Out';
    elapsedPanel.classList.remove('visible');
    elapsedTimeEl.textContent = '00:00:00';
    tappedInSinceEl.textContent = '';
    setRingProgress(0);
  }

  /* ── Elapsed timer ─────────────────────────────────────────────── */
  function startElapsedTimer(tapInTimestamp) {
    stopElapsedTimer();
    function tick() {
      const secs = elapsedSeconds(tapInTimestamp);
      elapsedTimeEl.textContent = formatElapsed(secs);
      setRingProgress(Math.min(secs / SHIFT_TARGET_SECS, 1));
    }
    tick();
    elapsedTimer = setInterval(tick, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
  }

  /* ── Progress ring ─────────────────────────────────────────────── */
  function setRingProgress(ratio) {
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    ringFill.style.strokeDashoffset = offset;
    // Colour gradient: green → amber → red (reversed – stays green for <80%)
    if (ratio >= 1) {
      ringFill.style.stroke = '#22c55e';
    } else {
      ringFill.style.stroke = '#22c55e';
    }
  }

  /* ── Confirmation Modal ────────────────────────────────────────── */
  function showConfirmModal() {
    tapState = getTapState();
    const secs = elapsedSeconds(tapState.tapInTimestamp);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    modalDuration.textContent = `${h}h ${m}m`;
    modalError.classList.add('hidden');
    modalError.textContent = '';
    modalOverlay.classList.remove('hidden');
  }

  function hideModal() {
    modalOverlay.classList.add('hidden');
  }

  modalCancel.addEventListener('click', hideModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) hideModal();
  });

  modalConfirm.addEventListener('click', async () => {
    tapState = getTapState();
    if (!tapState.tappedIn) { hideModal(); return; }

    const confirmLabel   = modalConfirm.querySelector('.btn-label');
    const confirmSpinner = modalConfirm.querySelector('.btn-spinner');

    modalConfirm.disabled = true;
    confirmLabel.classList.add('hidden');
    confirmSpinner.classList.remove('hidden');
    modalError.classList.add('hidden');

    const now        = new Date();
    const tapOutDisplay = formatTimeAmPm(now);
    const dateStr    = formatDateISO(now);
    const totalSecs  = elapsedSeconds(tapState.tapInTimestamp, now);
    const totalHours = formatTotalHours(totalSecs);

    try {
      const res = await apiLogAttendance({
        associateId: user.id,
        pin:         user.pin,
        date:        dateStr,
        tapIn:       tapState.tapInDisplay,
        tapOut:      tapOutDisplay,
        totalHours,
      });

      if (res?.success) {
        // Success path
        stopElapsedTimer();
        clearTapState();
        applyTappedOutUI();
        statLastShiftEl.textContent = totalHours;
        hideModal();
        haptic(200);
        showToast(`Shift logged! ${totalHours} ✓`, 'success');
      } else {
        throw new Error(res?.message || 'Server rejected the log. Please retry.');
      }
    } catch (err) {
      modalError.textContent = err.message;
      modalError.classList.remove('hidden');
      showToast('Failed to log shift', 'error');
    } finally {
      modalConfirm.disabled = false;
      confirmLabel.classList.remove('hidden');
      confirmSpinner.classList.add('hidden');
    }
  });

  /* ── Logout ────────────────────────────────────────────────────── */
  btnLogout.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?\nYour active timer will be lost.')) {
      stopElapsedTimer();
      clearInterval(clockTimer);
      onLogout();
    }
  });

  /* ── Bottom Sheet ──────────────────────────────────────────────── */
  function openSheet() {
    bottomSheet.classList.add('open');
    sheetBackdrop.classList.add('visible');
    loadHistory();
  }

  function closeSheet() {
    bottomSheet.classList.remove('open');
    sheetBackdrop.classList.remove('visible');
  }

  sheetFab.addEventListener('click', openSheet);
  sheetHandle.addEventListener('click', () => {
    bottomSheet.classList.contains('open') ? closeSheet() : openSheet();
  });
  sheetBackdrop.addEventListener('click', closeSheet);
  btnRefresh.addEventListener('click', () => {
    haptic(50);
    loadHistory();
  });

  // Drag-to-dismiss (touch)
  let touchStartY = 0;
  bottomSheet.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  bottomSheet.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientY - touchStartY;
    if (delta > 80) closeSheet();
  }, { passive: true });

  /* ── History Loading ───────────────────────────────────────────── */
  async function loadHistory() {
    historyList.innerHTML  = '';
    historyEmpty.classList.add('hidden');
    historyError.classList.add('hidden');
    historyLoading.classList.remove('hidden');
    btnRefresh.classList.add('spinning');

    try {
      const res = await apiGetHistory(user.id, user.pin);

      if (res?.success) {
        const records = Array.isArray(res.records) ? res.records : [];
        renderHistory(records);
      } else {
        throw new Error(res?.message || 'Failed to fetch history.');
      }
    } catch (err) {
      historyErrorText.textContent = err.message;
      historyLoading.classList.add('hidden');
      historyError.classList.remove('hidden');
    } finally {
      btnRefresh.classList.remove('spinning');
    }
  }

  function renderHistory(records) {
    historyLoading.classList.add('hidden');

    if (records.length === 0) {
      historyEmpty.classList.remove('hidden');
      return;
    }

    // Newest first
    const sorted = [...records].reverse();

    sorted.forEach((rec, idx) => {
      const li = document.createElement('li');
      li.className = 'history-card';
      li.style.animationDelay = `${idx * 40}ms`;
      li.innerHTML = `
        <div class="history-card-date">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          ${escHtml(rec.date ?? '—')}
        </div>
        <div class="history-card-row">
          <div class="history-card-cell">
            <span class="history-cell-label">Tap In</span>
            <span class="history-cell-value">${escHtml(rec.tapIn ?? rec['Tap In'] ?? '—')}</span>
          </div>
          <div class="history-card-cell">
            <span class="history-cell-label">Tap Out</span>
            <span class="history-cell-value">${escHtml(rec.tapOut ?? rec['Tap Out'] ?? '—')}</span>
          </div>
          <div class="history-card-cell">
            <span class="history-cell-label">Total</span>
            <span class="history-cell-value highlight">${escHtml(rec.totalHours ?? rec['Total Hours'] ?? '—')}</span>
          </div>
        </div>
      `;
      historyList.appendChild(li);
    });
  }
}

function escHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
