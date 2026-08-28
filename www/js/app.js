/**
 * app.js v2.0 – Application entry point.
 * Boot sequence, tab routing, offline queue retry, auto-logout.
 */

import { initLogin }   from './login.js';
import { initHome, updateOfflineBanner } from './home.js';
import { initHistory } from './history.js';
import { initProfile } from './profile.js';
import { initAdmin }   from './admin.js';
import { getUser, clearUser, clearTapState, getOfflineQueue, dequeueOffline } from './store.js';
import { apiLogAttendance } from './api.js';
import { showToast } from './utils.js';

const ADMIN_ID = '3261098';

/* ── Screen transitions ──────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

/* ── Boot ────────────────────────────────────────────────────── */
async function boot() {
  showScreen('screen-splash');
  await sleep(1400);

  const user = getUser();
  if (user) {
    mountDashboard(user);
    showScreen('screen-dashboard');
    // Retry offline queue on boot
    setTimeout(() => retryOfflineQueue(user), 2000);
  } else {
    mountLogin();
    showScreen('screen-login');
  }
}

/* ── Login mount ─────────────────────────────────────────────── */
function mountLogin() {
  initLogin({
    onSuccess: (user) => {
      mountDashboard(user);
      setTimeout(() => showScreen('screen-dashboard'), 100);
    },
  });
}

/* ── Dashboard mount ─────────────────────────────────────────── */
function mountDashboard(user) {
  const isAdmin = String(user.id) === ADMIN_ID;

  // Show/hide Admin tab
  const navAdmin = document.getElementById('nav-admin');
  const tabAdmin = document.getElementById('tab-admin');
  if (isAdmin) {
    navAdmin.classList.remove('hidden');
    tabAdmin.classList.remove('hidden');
  } else {
    navAdmin.classList.add('hidden');
    tabAdmin.classList.add('hidden');
  }

  /* ── Logout helper ─────────────────────────────────────────── */
  function doLogout() {
    clearUser();
    clearTapState();
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();
    document.getElementById('login-error-banner')?.classList.add('hidden');
    mountLogin();
    setTimeout(() => showScreen('screen-login'), 100);
  }

  /* ── Header logout button ──────────────────────────────────── */
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?\nYour active timer will be lost.')) doLogout();
  });

  /* ── Init panels ───────────────────────────────────────────── */
  const homeCtrl    = initHome({ user, onTapOut: () => historyCtrl.onTabActivate?.() });
  const historyCtrl = initHistory({ user });
  const profileCtrl = initProfile({
    user,
    onLogout: doLogout,
    onPinChanged: (updatedUser) => {
      // Refresh user reference (pin changed)
      Object.assign(user, updatedUser);
    },
  });
  const adminCtrl   = isAdmin ? initAdmin({ user }) : null;

  /* ── Tab router ────────────────────────────────────────────── */
  const navTabs    = document.querySelectorAll('.nav-tab');
  const tabPanels  = document.querySelectorAll('.tab-panel');

  navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');

      // Lazy-load panel content on first activation
      if (target === 'history') historyCtrl.onTabActivate?.();
      if (target === 'profile') profileCtrl.onTabActivate?.();
      if (target === 'admin' && adminCtrl) adminCtrl.onTabActivate?.();
    });
  });

  /* ── Offline banner init ───────────────────────────────────── */
  updateOfflineBanner();

  /* ── Online/offline detection ──────────────────────────────── */
  window.addEventListener('online', () => {
    showToast('Back online – syncing…', 'info');
    retryOfflineQueue(user);
  });
  window.addEventListener('offline', () => {
    showToast('You\'re offline – shifts will be queued', 'info');
    updateOfflineBanner();
  });
}

/* ── Offline Queue Retry ─────────────────────────────────────── */
async function retryOfflineQueue(user) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  let synced = 0;
  // Process from oldest → newest
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const res = await apiLogAttendance({ ...item, pin: user.pin });
      if (res?.success === true || res?.status === 'success') {
        dequeueOffline(0); // always remove index 0 since we shrink
        synced++;
        i--; // adjust loop index after removal
      }
    } catch {
      break; // still offline, stop retrying
    }
  }

  if (synced > 0) {
    showToast(`Synced ${synced} queued shift${synced > 1 ? 's' : ''} ✓`, 'success');
    updateOfflineBanner();
  }
}

/* ── Utility ─────────────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Run ─────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', boot);
