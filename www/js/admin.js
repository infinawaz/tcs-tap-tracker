/**
 * admin.js – Admin tab: associate list, search, drill-down, export all.
 * Only visible/accessible when user.id === '3261098'.
 */

import { apiAdminGetAssociates, apiAdminGetAssociateMonth, apiAdminExportAll } from './api.js';
import {
  lastNMonths, formatMonthLabel, formatMonthKey,
  parseTotalHoursToSecs, downloadCsvFile, showToast, escHtml, initials,
} from './utils.js';

export function initAdmin({ user }) {
  /* ── DOM refs ─────────────────────────────────────────────── */
  const adminMonthPicker   = document.getElementById('admin-month-picker');
  const adminListView      = document.getElementById('admin-list-view');
  const adminDrillView     = document.getElementById('admin-drill-view');
  const adminLoading       = document.getElementById('admin-loading');
  const adminErrorEl       = document.getElementById('admin-error');
  const adminErrorText     = document.getElementById('admin-error-text');
  const adminAssociateList = document.getElementById('admin-associate-list');
  const adminSearchInput   = document.getElementById('admin-search');
  const btnAdminExport     = document.getElementById('btn-admin-export');
  const btnAdminBack       = document.getElementById('btn-admin-back');

  // Drill-down refs
  const drillName          = document.getElementById('drill-name');
  const drillIdDisplay     = document.getElementById('drill-id-display');
  const drillMonthPicker   = document.getElementById('drill-month-picker');
  const drillSumDays       = document.getElementById('drill-sum-days');
  const drillSumSessions   = document.getElementById('drill-sum-sessions');
  const drillSumHours      = document.getElementById('drill-sum-hours');
  const drillList          = document.getElementById('drill-list');

  let adminMonth          = formatMonthKey();
  let allAssociates       = [];
  let drillTarget         = null;
  let drillMonth          = formatMonthKey();
  let hasLoaded           = false;

  /* ── Build Admin Month Picker ────────────────────────────── */
  const months = lastNMonths(6);
  months.forEach(yyyymm => {
    const pill = document.createElement('button');
    pill.className = 'month-pill' + (yyyymm === adminMonth ? ' active' : '');
    pill.textContent = formatMonthLabel(yyyymm);
    pill.dataset.month = yyyymm;
    pill.addEventListener('click', () => {
      adminMonthPicker.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      adminMonth = yyyymm;
    });
    adminMonthPicker.appendChild(pill);
  });

  /* ── Build Drill-Down Month Picker ───────────────────────── */
  months.forEach(yyyymm => {
    const pill = document.createElement('button');
    pill.className = 'month-pill' + (yyyymm === drillMonth ? ' active' : '');
    pill.textContent = formatMonthLabel(yyyymm);
    pill.dataset.month = yyyymm;
    pill.addEventListener('click', () => {
      drillMonthPicker.querySelectorAll('.month-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      drillMonth = yyyymm;
      if (drillTarget) loadDrillHistory(drillTarget.id, drillMonth);
    });
    drillMonthPicker.appendChild(pill);
  });

  /* ── Export All ──────────────────────────────────────────── */
  btnAdminExport.addEventListener('click', async () => {
    btnAdminExport.disabled = true;
    showToast('Preparing export…', 'info');
    try {
      const res = await apiAdminExportAll(user.id, user.pin, adminMonth);
      if (res?.success && res.csv) {
        downloadCsvFile(res.csv, res.filename || `TCS_All_${adminMonth}.csv`);
        showToast(`Exported ${res.rowCount || ''} records ✓`, 'success');
      } else {
        throw new Error(res?.message || 'Export failed.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnAdminExport.disabled = false;
    }
  });

  /* ── Search ──────────────────────────────────────────────── */
  adminSearchInput.addEventListener('input', () => {
    const q = adminSearchInput.value.trim().toLowerCase();
    renderAssociateList(q ? allAssociates.filter(a =>
      a.name.toLowerCase().includes(q) || String(a.id).includes(q)
    ) : allAssociates);
  });

  /* ── Back Button ─────────────────────────────────────────── */
  btnAdminBack.addEventListener('click', () => {
    adminDrillView.classList.add('hidden');
    adminListView.style.display = '';
    drillTarget = null;
    drillList.innerHTML = '';
  });

  /* ── onTabActivate ───────────────────────────────────────── */
  function onTabActivate() {
    if (!hasLoaded) {
      hasLoaded = true;
      loadAssociates();
    }
  }

  /* ── Load Associates ─────────────────────────────────────── */
  async function loadAssociates() {
    adminLoading.classList.remove('hidden');
    adminErrorEl.classList.add('hidden');
    adminAssociateList.innerHTML = '';

    try {
      const res = await apiAdminGetAssociates(user.id, user.pin);
      if (res?.success && Array.isArray(res.associates)) {
        allAssociates = res.associates;
        renderAssociateList(allAssociates);
      } else {
        throw new Error(res?.message || 'Failed to load associates.');
      }
    } catch (err) {
      adminErrorText.textContent = err.message;
      adminErrorEl.classList.remove('hidden');
    } finally {
      adminLoading.classList.add('hidden');
    }
  }

  /* ── Render Associate List ───────────────────────────────── */
  function renderAssociateList(associates) {
    adminAssociateList.innerHTML = '';
    if (associates.length === 0) {
      adminAssociateList.innerHTML = `<p style="color:var(--t-muted);text-align:center;padding:24px">No associates found.</p>`;
      return;
    }
    associates.forEach((assoc, idx) => {
      const card = document.createElement('div');
      card.className = 'associate-card';
      card.style.animationDelay = `${idx * 30}ms`;
      card.innerHTML = `
        <div class="associate-avatar">${escHtml(initials(assoc.name))}</div>
        <div class="associate-info">
          <div class="associate-name">${escHtml(assoc.name)}</div>
          <div class="associate-id">ID: ${escHtml(String(assoc.id))}</div>
        </div>
        <div class="associate-stats">
          <div class="associate-hours">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="associate-days" style="font-size:0.68rem;color:var(--t-muted)">${escHtml(assoc.role || '')}</div>
        </div>
      `;
      card.addEventListener('click', () => openDrillDown(assoc));
      adminAssociateList.appendChild(card);
    });
  }

  /* ── Drill-Down ──────────────────────────────────────────── */
  function openDrillDown(assoc) {
    drillTarget = assoc;
    drillName.textContent    = assoc.name;
    drillIdDisplay.textContent = `ID: ${assoc.id} · ${assoc.role || 'Associate'}`;
    drillList.innerHTML      = '';
    drillSumDays.textContent = drillSumSessions.textContent = drillSumHours.textContent = '—';

    adminListView.style.display = 'none';
    adminDrillView.classList.remove('hidden');

    loadDrillHistory(assoc.id, drillMonth);
  }

  async function loadDrillHistory(targetId, month) {
    drillList.innerHTML = `<div class="skeleton-list"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card" style="opacity:0.6"></div></div>`;
    drillSumDays.textContent = drillSumSessions.textContent = drillSumHours.textContent = '…';

    try {
      const res = await apiAdminGetAssociateMonth(user.id, user.pin, targetId, month);
      if (!res?.success) throw new Error(res?.message || 'Failed.');
      const records = Array.isArray(res.records) ? res.records : [];
      renderDrillRecords(records);
    } catch (err) {
      drillList.innerHTML = `<div class="state-error"><p>${escHtml(err.message)}</p></div>`;
      drillSumDays.textContent = drillSumSessions.textContent = drillSumHours.textContent = '—';
    }
  }

  function renderDrillRecords(records) {
    drillList.innerHTML = '';

    // Compute summary
    const uniqueDates = new Set();
    let totalSecs = 0;
    records.forEach(r => {
      const date  = r['Date'] || r.date || '';
      const dSecs = parseInt(r['Duration (secs)'] || r.durationSecs || 0, 10)
                  || parseTotalHoursToSecs(r['Total Hours'] || r.totalHours || '');
      if (date) uniqueDates.add(date);
      totalSecs += dSecs;
    });

    drillSumDays.textContent     = uniqueDates.size;
    drillSumSessions.textContent = records.length;
    drillSumHours.textContent    = (totalSecs / 3600).toFixed(1) + 'h';

    if (records.length === 0) {
      drillList.innerHTML = `<div class="state-empty"><p>No records this month.</p></div>`;
      return;
    }

    // Group by date, newest first
    const grouped = {};
    [...records].reverse().forEach(rec => {
      const date = rec['Date'] || rec.date || 'Unknown';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(rec);
    });

    Object.entries(grouped).forEach(([date, dayRecs], gi) => {
      const hdr = document.createElement('div');
      hdr.className = 'history-day-header';
      hdr.textContent = formatDayLabel(date);
      drillList.appendChild(hdr);

      dayRecs.forEach((rec, i) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.style.animationDelay = `${(gi * 3 + i) * 30}ms`;
        const tapIn  = escHtml(rec['Tap In']      || rec.tapIn      || '—');
        const tapOut = escHtml(rec['Tap Out']     || rec.tapOut     || '—');
        const total  = escHtml(rec['Total Hours'] || rec.totalHours || '—');
        card.innerHTML = `
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
        drillList.appendChild(card);
      });
    });
  }

  function formatDayLabel(dateStr) {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  }

  return { onTabActivate };
}
