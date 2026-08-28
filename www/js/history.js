/**
 * history.js – History tab: month picker, per-day grouped records,
 *              summary chips, skeleton loading, CSV download.
 */

import { apiGetMonthHistory, apiDownloadMonth } from './api.js';
import { getCachedHistory, setCachedHistory } from './store.js';
import {
  lastNMonths, formatMonthLabel, formatMonthKey,
  parseTotalHoursToSecs, downloadCsvFile, showToast, escHtml,
} from './utils.js';

export function initHistory({ user }) {
  const monthPicker   = document.getElementById('month-picker');
  const listEl        = document.getElementById('history-list');
  const emptyEl       = document.getElementById('history-empty');
  const loadingEl     = document.getElementById('history-loading');
  const errorEl       = document.getElementById('history-error');
  const errorTextEl   = document.getElementById('history-error-text');
  const retryBtn      = document.getElementById('btn-retry-history');
  const downloadBtn   = document.getElementById('btn-download-csv');
  const sumDaysEl     = document.getElementById('sum-days');
  const sumSessionsEl = document.getElementById('sum-sessions');
  const sumHoursEl    = document.getElementById('sum-hours');

  let currentMonth    = formatMonthKey();   // "YYYYMM"
  let currentRecords  = [];
  let isLoading       = false;

  /* ── Build Month Picker ──────────────────────────────────── */
  const months = lastNMonths(6);
  months.forEach(yyyymm => {
    const pill = document.createElement('button');
    pill.className = 'month-pill' + (yyyymm === currentMonth ? ' active' : '');
    pill.textContent = formatMonthLabel(yyyymm);
    pill.dataset.month = yyyymm;
    pill.addEventListener('click', () => {
      if (pill.dataset.month === currentMonth) return;
      monthPicker.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentMonth = pill.dataset.month;
      loadHistory(currentMonth);
    });
    monthPicker.appendChild(pill);
  });

  /* ── Event Bindings ──────────────────────────────────────── */
  downloadBtn.addEventListener('click', handleDownload);
  retryBtn.addEventListener('click', () => loadHistory(currentMonth));

  /* ── Triggered from app.js when History tab is activated ── */
  let hasLoaded = false;
  function onTabActivate() {
    if (!hasLoaded) {
      hasLoaded = true;
      loadHistory(currentMonth);
    }
  }

  /* ── Load History ────────────────────────────────────────── */
  async function loadHistory(month) {
    if (isLoading) return;
    isLoading = true;

    // Check cache first
    const cached = getCachedHistory(user.id, month);
    if (cached) {
      renderHistory(cached);
      isLoading = false;
      return;
    }

    showState('loading');

    try {
      const res = await apiGetMonthHistory(user.id, user.pin, month);
      if (res?.success === true || res?.status === 'success') {
        const records = Array.isArray(res.records) ? res.records
                      : Array.isArray(res.data)    ? res.data
                      : [];
        setCachedHistory(user.id, month, records);
        renderHistory(records);
      } else {
        throw new Error(res?.message || 'Failed to fetch history.');
      }
    } catch (err) {
      errorTextEl.textContent = err.message;
      showState('error');
    } finally {
      isLoading = false;
    }
  }

  /* ── Render History ──────────────────────────────────────── */
  function renderHistory(records) {
    currentRecords = records;
    listEl.innerHTML = '';

    if (!records || records.length === 0) {
      showState('empty');
      updateSummary([], 0);
      return;
    }

    showState('list');
    updateSummary(records, records.length);

    // Group by date (newest date first)
    const grouped = {};
    [...records].reverse().forEach(rec => {
      const date = rec['Date'] || rec.date || 'Unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(rec);
    });

    Object.entries(grouped).forEach(([date, dayRecs], gi) => {
      // Day header
      const hdr = document.createElement('div');
      hdr.className = 'history-day-header';
      hdr.textContent = formatDayLabel(date);
      listEl.appendChild(hdr);

      // Day's records
      dayRecs.forEach((rec, i) => {
        const li = document.createElement('div');
        li.className = 'history-card';
        li.style.animationDelay = `${(gi * 3 + i) * 35}ms`;
        const tapIn   = escHtml(rec['Tap In']      || rec.tapIn      || '—');
        const tapOut  = escHtml(rec['Tap Out']     || rec.tapOut     || '—');
        const total   = escHtml(rec['Total Hours'] || rec.totalHours || '—');
        li.innerHTML = `
          <div class="history-card-row">
            <div class="history-card-cell">
              <span class="history-cell-label">Tap In</span>
              <span class="history-cell-value">${tapIn}</span>
            </div>
            <div class="history-card-cell">
              <span class="history-cell-label">Tap Out</span>
              <span class="history-cell-value">${tapOut}</span>
            </div>
            <div class="history-card-cell">
              <span class="history-cell-label">Duration</span>
              <span class="history-cell-value highlight">${total}</span>
            </div>
          </div>
        `;
        listEl.appendChild(li);
      });
    });
  }

  /* ── Summary Chips ───────────────────────────────────────── */
  function updateSummary(records, sessionCount) {
    const uniqueDates = new Set(records.map(r => r['Date'] || r.date || '').filter(Boolean));
    let totalSecs = 0;
    records.forEach(r => {
      const dSecs = parseInt(r['Duration (secs)'] || r.durationSecs || 0, 10)
                  || parseTotalHoursToSecs(r['Total Hours'] || r.totalHours || '');
      totalSecs += dSecs;
    });
    const totalHrs = (totalSecs / 3600).toFixed(1);

    sumDaysEl.textContent     = uniqueDates.size;
    sumSessionsEl.textContent = sessionCount;
    sumHoursEl.textContent    = totalHrs + 'h';
  }

  /* ── CSV Download ────────────────────────────────────────── */
  async function handleDownload() {
    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.6';
    showToast('Preparing CSV…', 'info');

    try {
      const res = await apiDownloadMonth(user.id, user.pin, currentMonth);
      if (res?.success && res.csv) {
        downloadCsvFile(res.csv, res.filename || `TCS_${user.id}_${currentMonth}.csv`);
        showToast('CSV downloaded ✓', 'success');
      } else {
        throw new Error(res?.message || 'Download failed.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.style.opacity = '';
    }
  }

  /* ── State helpers ───────────────────────────────────────── */
  function showState(state) {
    loadingEl.classList.toggle('hidden', state !== 'loading');
    emptyEl.classList.toggle('hidden',   state !== 'empty');
    errorEl.classList.toggle('hidden',   state !== 'error');
    listEl.style.display = state === 'list' ? '' : 'none';
    if (state !== 'list' && state !== 'loading') {
      sumDaysEl.textContent = '—';
      sumSessionsEl.textContent = '—';
      sumHoursEl.textContent = '—';
    }
  }

  function formatDayLabel(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  return { onTabActivate };
}
