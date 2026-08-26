/**
 * login.js – Login screen controller.
 */

import { apiLogin } from './api.js';
import { saveUser } from './store.js';
import { showToast } from './utils.js';

export function initLogin({ onSuccess }) {
  const form          = document.getElementById('login-form');
  const inputId       = document.getElementById('input-associate-id');
  const inputPin      = document.getElementById('input-pin');
  const errId         = document.getElementById('error-associate-id');
  const errPin        = document.getElementById('error-pin');
  const errBanner     = document.getElementById('login-error-banner');
  const errBannerText = document.getElementById('login-error-text');
  const btnLogin      = document.getElementById('btn-login');
  const btnLabel      = btnLogin.querySelector('.btn-label');
  const btnSpinner    = btnLogin.querySelector('.btn-spinner');
  const togglePin     = document.getElementById('toggle-pin');
  const eyeOpen       = togglePin.querySelector('.eye-open');
  const eyeClosed     = togglePin.querySelector('.eye-closed');

  /* ── PIN visibility toggle ─────────────────────────────────────── */
  togglePin.addEventListener('click', () => {
    const isText = inputPin.type === 'text';
    inputPin.type = isText ? 'password' : 'text';
    eyeOpen.classList.toggle('hidden', !isText);
    eyeClosed.classList.toggle('hidden', isText);
  });

  /* ── Live validation ───────────────────────────────────────────── */
  inputId.addEventListener('input', () => clearFieldError(inputId, errId));
  inputPin.addEventListener('input', () => {
    // Keep numeric only
    inputPin.value = inputPin.value.replace(/\D/g, '').slice(0, 4);
    clearFieldError(inputPin, errPin);
  });

  /* ── Form submit ───────────────────────────────────────────────── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideBanner();

    const associateId = inputId.value.trim();
    const pin         = inputPin.value.trim();

    // Client-side validation
    let valid = true;
    if (!associateId) { showFieldError(inputId, errId, 'Associate ID is required.'); valid = false; }
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      showFieldError(inputPin, errPin, 'Enter a valid 4-digit numeric PIN.'); valid = false;
    }
    if (!valid) return;

    setLoading(true);
    try {
      const res = await apiLogin(associateId, pin);

      // GAS backend returns { status:"success" } OR { success:true } — handle both
      if (res?.success === true || res?.status === 'success') {
        // Normalise user profile — backend may return varying structures
        const user = {
          id:   String(res.user?.id   ?? associateId),
          name: res.user?.name ?? res.name ?? associateId,
          role: res.user?.role ?? res.role ?? 'Associate',
          pin,
        };
        saveUser(user);
        onSuccess(user);
      } else {
        showBanner(res?.message || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      showBanner(err.message || 'Network error. Please try again.');
      showToast('Connection failed', 'error');
    } finally {
      setLoading(false);
    }
  });

  /* ── Helpers ───────────────────────────────────────────────────── */
  function setLoading(loading) {
    btnLogin.disabled = loading;
    btnLabel.classList.toggle('hidden', loading);
    btnSpinner.classList.toggle('hidden', !loading);
  }

  function showFieldError(input, el, msg) {
    input.classList.add('error');
    el.textContent = msg;
  }

  function clearFieldError(input, el) {
    input.classList.remove('error');
    el.textContent = '';
  }

  function showBanner(msg) {
    errBannerText.textContent = msg;
    errBanner.classList.remove('hidden');
  }

  function hideBanner() {
    errBanner.classList.add('hidden');
  }
}
