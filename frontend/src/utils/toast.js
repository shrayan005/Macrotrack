/**
 * toast.js
 *
 * Lightweight imperative toast notification utility that injects a DOM element
 * into document.body and auto-removes it after ~3 seconds. Only one toast is
 * shown at a time — a new call removes any existing toast first.
 * Exports: showToast
 */

/**
 * Display a transient toast notification.
 * @param {string} message - Text to display in the toast
 * @param {boolean} [isError=false] - When true, applies the error-toast style
 * @returns {void}
 */

let activeToast = null;

export function showToast(message, isError = false) {
  // Remove any existing toast
  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }

  const toast = document.createElement('div');
  toast.className = isError ? 'error-toast' : 'success-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  activeToast = toast;

  setTimeout(() => {
    toast.style.animation = 'toastFadeOut 0.3s ease-out forwards';
    setTimeout(() => {
      toast.remove();
      if (activeToast === toast) {
        activeToast = null;
      }
    }, 300);
  }, 2700);
}
