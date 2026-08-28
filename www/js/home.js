/**
 * home.js – Home tab: Tap In/Out, elapsed timer, progress ring,
 *            week heatmap, week summary, quick stats.
 */

import { apiLogAttendance, apiGetMonthHistory } from './api.js';
import { getTapState, saveTapState, clearTapState, enqueueOffline, getOfflineQueue } from './store.js';
import {
  formatTimeAmPm, formatDateISO, formatDateLong, elapsedSeconds,
  formatElapsed, formatTotalHours, haptic, showToast, greeting,
  currentWeekDays, formatMonthKey, parseTotalHoursToSecs,
} from './utils.js';

const SHIFT_TARGET_SECS   = 9 * 3600;
const RING_CIRCUMFERENCE  = 2 * Math.PI * 100; // ≈ 628.3

export function initHome({ user, onTapOut }) {
  /* ── DOM refs ─────────────────────────────────────────────── */
  const tapBtn          = document.getElementById('tap-btn');
  const tapBtnLabel     = document.getElementById('tap-btn-label');
  const statusPill      = document.getElementById('status-pill');
  const statusLabel     = document.getElementById('status-label');
  const elapsedPanel    = document.getElementById('elapsed-panel');
  const elapsedTimeEl   = document.getElementById('elapsed-time');
  const tappedInSinceEl = document.getElementById('tapped-in-since');
  const ringFill        = document.getElementById('ring-fill');
  const liveDateEl      = document.getElementById('live-date');
  const liveClockEl     = document.getElementById('live-clock');
  const timeGreetingEl  = document.getElementById('time-greeting');
  const userNameEl      = document.getElementById('user-name-display');
  const userAvatarEl    = document.getElementById('user-avatar');
  const statDateEl      = document.getElementById('stat-date');
  const statLastShiftEl = document.getElementById('stat-last-shift');
  const statMonthDaysEl = document.getElementById('stat-month-days');
  const statMonthHrsEl  = document.getElementById('stat-month-hours');
  const weekHeatmapRow  = document.getElementById('week-heatmap-row');
  const weekTotalHrsEl  = document.getElementById('week-total-hours');
  const weekDaysCountEl = document.getElementById('week-days-count');
  const historyBadge    = document.getElementById('history-badge');

  // Modals
  const modalOverlay  = document.getElementById('modal-overlay');
  const modalDuration = document.getElementById('modal-duration');
  const modalCancel   = document.getElementById('modal-cancel');
  const modalConfirm  = document.getElementById('modal-confirm');
  const modalError    = document.getElementById('modal-error');
  const summaryOverlay    = document.getElementById('summary-overlay');
  const sumDuration       = document.getElementById('sum-duration');
  const sumTapIn          = document.getElementById('sum-tap-in');
  const sumTapOut         = document.getElementById('sum-tap-out');
  const sumSessionDate    = document.getElementById('sum-session-date');
  const btnSummaryClose   = document.getElementById('btn-summary-close');

  let elapsedTimer = null;
  let clockTimer   = null;

  /* ── Populate header ─────────────────────────────────────── */
  userNameEl.textContent   = user.name;
  userAvatarEl.textContent = initials(user.name);
  timeGreetingEl.textContent = greeting();
  statDateEl.textContent   = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  /* ── Live clock ──────────────────────────────────────────── */
  function updateClock() {
    const now = new Date();
    liveDateEl.textContent = formatDateLong(now);
    liveClockEl.textContent = formatTimeAmPm(now);
    timeGreetingEl.textContent = greeting();
  }
  updateClock();
  clockTimer = setInterval(updateClock, 1000);

  /* ── Restore tap state ───────────────────────────────────── */
  let tapState = getTapState();
  if (tapState.tappedIn) {
    applyTappedInUI(tapState.tapInTimestamp);
    startElapsedTimer(tapState.tapInTimestamp);
  } else {
    applyTappedOutUI();
  }

  /* ── Build week heatmap (will fill with API data) ────────── */
  buildWeekHeatmap({});

  /* ── Load month stats ────────────────────────────────────── */
  loadMonthStats();

  /* ── Tap button ──────────────────────────────────────────── */
  tapBtn.addEventListener('click', () => {
    haptic(100);
    tapState = getTapState();
    if (!tapState.tappedIn) {
      // TAP IN
      const now         = new Date();
      const tapInDisplay = formatTimeAmPm(now);
      const newState    = { tappedIn: true, tapInTimestamp: now.toISOString(), tapInDisplay };
      saveTapState(newState);
      tapState = newState;
      applyTappedInUI(now.toISOString());
      startElapsedTimer(now.toISOString());
      showToast('Shift started! Have a great day 👋', 'success');
    } else {
      showConfirmModal();
    }
  });

  /* ── UI helpers ──────────────────────────────────────────── */
  function applyTappedInUI(ts) {
    tapBtn.classList.add('tapped-in');
    tapBtnLabel.textContent = 'TAP OUT';
    statusPill.classList.add('active');
    statusLabel.textContent = 'Tapped In';
    elapsedPanel.classList.add('visible');
    const d = new Date(ts);
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

  /* ── Elapsed timer ───────────────────────────────────────── */
  function startElapsedTimer(ts) {
    stopElapsedTimer();
    function tick() {
      const secs = elapsedSeconds(ts);
      elapsedTimeEl.textContent = formatElapsed(secs);
      setRingProgress(Math.min(secs / SHIFT_TARGET_SECS, 1));
    }
    tick();
    elapsedTimer = setInterval(tick, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
  }

  /* ── Progress ring ───────────────────────────────────────── */
  function setRingProgress(ratio) {
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
    ringFill.style.stroke = ratio >= 1 ? 'var(--c-success)' : 'var(--c-purple)';
    ringFill.style.filter = ratio >= 1
      ? 'drop-shadow(0 0 6px var(--c-success))'
      : 'drop-shadow(0 0 6px var(--c-purple))';
  }

  /* ── Confirmation Modal ──────────────────────────────────── */
  function showConfirmModal() {
    tapState = getTapState();
    const secs = elapsedSeconds(tapState.tapInTimestamp);
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    modalDuration.textContent = `${h}h ${m}m`;
    modalError.classList.add('hidden');
    modalError.textContent = '';
    modalOverlay.classList.add('visible');
  }

  function hideModal() {
    modalOverlay.classList.remove('visible');
  }

  modalCancel.addEventListener('click', hideModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });

  modalConfirm.addEventListener('click', async () => {
    tapState = getTapState();
    if (!tapState.tappedIn) { hideModal(); return; }

    const confirmLabel   = modalConfirm.querySelector('.btn-label');
    const confirmSpinner = modalConfirm.querySelector('.btn-spinner');
    modalConfirm.disabled = true;
    confirmLabel.classList.add('hidden');
    confirmSpinner.classList.remove('hidden');
    modalError.classList.add('hidden');

    const now            = new Date();
    const tapOutDisplay  = formatTimeAmPm(now);
    const dateStr        = formatDateISO(now);
    const totalSecs      = elapsedSeconds(tapState.tapInTimestamp, now);
    const totalHours     = formatTotalHours(totalSecs);
    const payload        = {
      associateId: user.id,
      pin:         user.pin,
      date:        dateStr,
      tapIn:       tapState.tapInDisplay,
      tapOut:      tapOutDisplay,
      totalHours,
      durationSecs: totalSecs,
    };

    try {
      const res = await apiLogAttendance(payload);

      if (res?.success === true || res?.status === 'success') {
        stopElapsedTimer();
        clearTapState();
        applyTappedOutUI();
        statLastShiftEl.textContent = totalHours;
        hideModal();
        haptic(200);

        // Show session summary
        showSessionSummary({ totalHours, tapIn: tapState.tapInDisplay, tapOut: tapOutDisplay, date: dateStr });
        // Refresh stats in background
        setTimeout(() => loadMonthStats(), 500);
        if (onTapOut) onTapOut();
      } else {
        throw new Error(res?.message || 'Server rejected the log. Please retry.');
      }
    } catch (err) {
      // Offline queue fallback
      if (!navigator.onLine || err.message.includes('timed out') || err.message.includes('Failed to fetch')) {
        enqueueOffline(payload);
        stopElapsedTimer();
        clearTapState();
        applyTappedOutUI();
        statLastShiftEl.textContent = totalHours;
        hideModal();
        showToast('Saved offline – will sync when connected 📶', 'info');
        updateOfflineBanner();
        showSessionSummary({ totalHours, tapIn: tapState.tapInDisplay, tapOut: tapOutDisplay, date: dateStr });
      } else {
        modalError.textContent = err.message;
        modalError.classList.remove('hidden');
        showToast('Failed to log shift', 'error');
      }
    } finally {
      modalConfirm.disabled = false;
      confirmLabel.classList.remove('hidden');
      confirmSpinner.classList.add('hidden');
    }
  });

  /* ── Session Summary Modal ───────────────────────────────── */
  function showSessionSummary({ totalHours, tapIn, tapOut, date }) {
    sumDuration.textContent    = totalHours;
    sumTapIn.textContent       = tapIn || '—';
    sumTapOut.textContent      = tapOut || '—';
    sumSessionDate.textContent = date || '—';
    summaryOverlay.classList.add('visible');
  }

  btnSummaryClose.addEventListener('click', () => summaryOverlay.classList.remove('visible'));
  summaryOverlay.addEventListener('click', (e) => {
    if (e.target === summaryOverlay) summaryOverlay.classList.remove('visible');
  });

  /* ── Week Heatmap ────────────────────────────────────────── */
  function buildWeekHeatmap(hoursPerDate) {
    weekHeatmapRow.innerHTML = '';
    const days = currentWeekDays();
    days.forEach(({ dateISO, label, isToday }) => {
      const hrs = hoursPerDate[dateISO] || 0;
      const barHeight = Math.min(48, Math.round(hrs * 5.3)); // max 9h → 48px
      const hasData = hrs > 0;
      const col = document.createElement('div');
      col.className = 'week-day';
      col.innerHTML = `
        <div class="week-day-bar ${isToday ? 'today' : hasData ? 'has-data' : ''}"
             style="height:${Math.max(4, barHeight)}px"
             title="${dateISO}: ${formatTotalHours(hrs * 3600)}"></div>
        <span class="week-day-label ${isToday ? 'today' : ''}">${label}</span>
      `;
      weekHeatmapRow.appendChild(col);
    });
  }

  /* ── Load Month Stats (background) ──────────────────────── */
  async function loadMonthStats() {
    try {
      const month = formatMonthKey();
      const res   = await apiGetMonthHistory(user.id, user.pin, month);
      if (!res?.success) return;
      const records = Array.isArray(res.records) ? res.records : [];

      // Parse records
      const uniqueDates = new Set();
      let totalSecs = 0;
      const hoursPerDate = {};

      records.forEach(r => {
        const date = r['Date'] || r.date || '';
        const dSecs = parseInt(r['Duration (secs)'] || r.durationSecs || 0, 10) || parseTotalHoursToSecs(r['Total Hours'] || r.totalHours || '');
        if (date) uniqueDates.add(date);
        totalSecs += dSecs;
        hoursPerDate[date] = (hoursPerDate[date] || 0) + dSecs / 3600;
      });

      const daysPresent   = uniqueDates.size;
      const totalHrs      = (totalSecs / 3600).toFixed(1);
      const sessionsCount = records.length;

      statMonthDaysEl.textContent = `${daysPresent} day${daysPresent !== 1 ? 's' : ''}`;
      statMonthHrsEl.textContent  = `${totalHrs}h`;

      // Week summary
      const weekDays = currentWeekDays();
      const weekDates = new Set(weekDays.map(d => d.dateISO));
      let weekSecs = 0, weekDaysPresent = 0;
      const weekHoursPerDate = {};
      Object.entries(hoursPerDate).forEach(([date, hrs]) => {
        if (weekDates.has(date)) {
          weekSecs += hrs * 3600;
          weekDaysPresent++;
          weekHoursPerDate[date] = hrs;
        }
      });
      const weekHrs = (weekSecs / 3600).toFixed(1);
      weekTotalHrsEl.textContent = `${weekHrs}h`;
      weekDaysCountEl.textContent = `${weekDaysPresent} day${weekDaysPresent !== 1 ? 's' : ''} · ${sessionsCount} sessions`;

      // History badge
      if (sessionsCount > 0) {
        historyBadge.textContent = sessionsCount > 99 ? '99+' : sessionsCount;
        historyBadge.classList.remove('hidden');
      }

      // Update heatmap with real data
      buildWeekHeatmap(hoursPerDate);

      // Last shift
      if (records.length > 0) {
        const last = records[records.length - 1];
        statLastShiftEl.textContent = last['Total Hours'] || last.totalHours || '—';
      }
    } catch (e) {
      // Non-fatal – stats just stay as —
    }
  }

  return { stopTimers: () => { stopElapsedTimer(); clearInterval(clockTimer); } };
}

/* ── Offline Banner ──────────────────────────────────────────── */
export function updateOfflineBanner() {
  const banner   = document.getElementById('offline-banner');
  const countEl  = document.getElementById('offline-queue-count');
  const queue    = getOfflineQueue();
  if (!banner || !countEl) return;
  if (queue.length > 0) {
    countEl.textContent = queue.length;
    banner.classList.add('visible');
  } else {
    banner.classList.remove('visible');
  }
}

/* Helper: initials (mirrors utils.js to avoid circular) */
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}
