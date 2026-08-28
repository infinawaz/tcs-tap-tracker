/**
 * login.js v2.0 – Sign In and Sign Up tabs.
 */

import { apiLogin, apiRegister } from './api.js';
import { saveUser } from './store.js';
import { showToast } from './utils.js';

export function initLogin({ onSuccess }) {

  /* ── Tab switching ─────────────────────────────────────────── */
  const tabSignIn  = document.getElementById('tab-signin');
  const tabSignUp  = document.getElementById('tab-signup');
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  tabSignIn.addEventListener('click', () => switchTab('signin'));
  tabSignUp.addEventListener('click', () => switchTab('signup'));

  function switchTab(tab) {
    const isSignIn = tab === 'signin';
    tabSignIn.classList.toggle('active', isSignIn);
    tabSignUp.classList.toggle('active', !isSignIn);
    loginForm.classList.toggle('hidden', !isSignIn);
    signupForm.classList.toggle('hidden', isSignIn);
    hideBanner('login'); hideBanner('signup');
  }

  /* ════════════════════════════════════════
     SIGN IN
  ════════════════════════════════════════ */
  const inputId   = document.getElementById('input-associate-id');
  const inputPin  = document.getElementById('input-pin');
  const errId     = document.getElementById('error-associate-id');
  const errPin    = document.getElementById('error-pin');
  const btnLogin  = document.getElementById('btn-login');
  const togglePin = document.getElementById('toggle-pin');

  setupPinToggle(togglePin, inputPin);
  inputId.addEventListener('input',  () => clearFieldError(inputId, errId));
  inputPin.addEventListener('input', () => {
    inputPin.value = inputPin.value.replace(/\D/g, '').slice(0, 4);
    clearFieldError(inputPin, errPin);
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner('login');

    const associateId = inputId.value.trim();
    const pin         = inputPin.value.trim();

    let valid = true;
    if (!associateId) { showFieldError(inputId, errId, 'Associate ID is required.'); valid = false; }
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      showFieldError(inputPin, errPin, 'Enter a valid 4-digit PIN.'); valid = false;
    }
    if (!valid) return;

    setLoading(btnLogin, true);
    try {
      const res = await apiLogin(associateId, pin);
      if (res?.success === true || res?.status === 'success') {
        const user = {
          id:   String(res.user?.id   ?? associateId),
          name: res.user?.name ?? res.name ?? associateId,
          role: res.user?.role ?? res.role ?? 'Associate',
          pin,
        };
        saveUser(user);
        onSuccess(user);
      } else {
        showBanner('login', res?.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      showBanner('login', err.message || 'Network error. Please try again.');
      showToast('Connection failed', 'error');
    } finally {
      setLoading(btnLogin, false);
    }
  });

  /* ════════════════════════════════════════
     SIGN UP
  ════════════════════════════════════════ */
  const suName        = document.getElementById('su-name');
  const suId          = document.getElementById('su-id');
  const suPin         = document.getElementById('su-pin');
  const suConfirm     = document.getElementById('su-confirm-pin');
  const suRole        = document.getElementById('su-role');
  const suTogglePin   = document.getElementById('su-toggle-pin');
  const btnSignup     = document.getElementById('btn-signup');
  const suErrName     = document.getElementById('su-error-name');
  const suErrId       = document.getElementById('su-error-id');
  const suErrPin      = document.getElementById('su-error-pin');
  const suErrConfirm  = document.getElementById('su-error-confirm');

  setupPinToggle(suTogglePin, suPin);

  suName.addEventListener('input',    () => clearFieldError(suName, suErrName));
  suId.addEventListener('input',      () => clearFieldError(suId, suErrId));
  suPin.addEventListener('input',     () => { suPin.value = suPin.value.replace(/\D/g, '').slice(0, 4); clearFieldError(suPin, suErrPin); });
  suConfirm.addEventListener('input', () => { suConfirm.value = suConfirm.value.replace(/\D/g, '').slice(0, 4); clearFieldError(suConfirm, suErrConfirm); });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner('signup');

    const name       = suName.value.trim();
    const associateId = suId.value.trim();
    const pin        = suPin.value.trim();
    const confirmPin = suConfirm.value.trim();
    const role       = suRole.value;

    let valid = true;
    if (!name)        { showFieldError(suName, suErrName, 'Full name is required.'); valid = false; }
    if (!associateId) { showFieldError(suId, suErrId, 'Associate ID is required.'); valid = false; }
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      showFieldError(suPin, suErrPin, 'PIN must be exactly 4 digits.'); valid = false;
    }
    if (pin !== confirmPin) { showFieldError(suConfirm, suErrConfirm, 'PINs do not match.'); valid = false; }
    if (!valid) return;

    setLoading(btnSignup, true);
    try {
      const res = await apiRegister({ associateId, name, pin, role });
      if (res?.success === true || res?.status === 'success') {
        const user = {
          id:   String(res.user?.id ?? associateId),
          name: res.user?.name ?? name,
          role: res.user?.role ?? role,
          pin,
        };
        saveUser(user);
        showToast(`Welcome, ${user.name}! Account created ✓`, 'success');
        onSuccess(user);
      } else {
        showBanner('signup', res?.message || 'Registration failed. Associate ID may already exist.');
      }
    } catch (err) {
      showBanner('signup', err.message || 'Network error. Please try again.');
      showToast('Connection failed', 'error');
    } finally {
      setLoading(btnSignup, false);
    }
  });

  /* ── Shared helpers ────────────────────────────────────────── */
  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.querySelector('.btn-label').classList.toggle('hidden', loading);
    btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
  }

  function showFieldError(input, el, msg) { input.classList.add('error'); el.textContent = msg; }
  function clearFieldError(input, el) { input.classList.remove('error'); el.textContent = ''; }

  function showBanner(form, msg) {
    const banner = document.getElementById(`${form}-error-banner`);
    const text   = document.getElementById(`${form}-error-text`);
    if (banner && text) { text.textContent = msg; banner.classList.remove('hidden'); }
  }
  function hideBanner(form) {
    document.getElementById(`${form}-error-banner`)?.classList.add('hidden');
  }

  function setupPinToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.querySelector('.eye-open').classList.toggle('hidden', !isText);
      btn.querySelector('.eye-closed').classList.toggle('hidden', isText);
    });
  }
}
