/**
 * app.js – Application entry point.
 * Bootstraps the app: reads persisted auth, controls screen transitions.
 */

import { initLogin }     from './login.js';
import { initDashboard } from './dashboard.js';
import { getUser, clearUser, clearTapState } from './store.js';

/* ── Screen transition helpers ───────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.remove('fade-out');
  });
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function transitionTo(id, delay = 0) {
  setTimeout(() => showScreen(id), delay);
}

/* ── Boot ────────────────────────────────────────────────────────── */
async function boot() {
  // Show splash immediately
  showScreen('screen-splash');

  // Small deliberate delay for splash branding
  await sleep(1400);

  const user = getUser();

  if (user) {
    mountDashboard(user);
    transitionTo('screen-dashboard');
  } else {
    mountLogin();
    transitionTo('screen-login');
  }
}

/* ── Login mount ─────────────────────────────────────────────────── */
function mountLogin() {
  initLogin({
    onSuccess: (user) => {
      mountDashboard(user);
      transitionTo('screen-dashboard', 100);
    },
  });
}

/* ── Dashboard mount ─────────────────────────────────────────────── */
function mountDashboard(user) {
  initDashboard({
    user,
    onLogout: () => {
      clearUser();
      clearTapState();
      // Re-mount login fresh (reset form)
      const loginForm = document.getElementById('login-form');
      if (loginForm) loginForm.reset();
      document.getElementById('login-error-banner')?.classList.add('hidden');
      mountLogin();
      transitionTo('screen-login', 100);
    },
  });
}

/* ── Utility ─────────────────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Run ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', boot);
