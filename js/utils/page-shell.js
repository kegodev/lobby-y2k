// js/utils/page-shell.js
// ─────────────────────────────────────────────────────────────
// Bootstraps every page: theme, nav scroll, splash, auth state
// Import this as the FIRST module on every HTML page.
// ─────────────────────────────────────────────────────────────
import { initTheme, toggleTheme, updateCartBadge } from './helpers.js';
import { supabase } from '../supabase.js';

// 1. Theme
const theme = initTheme();
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';

window.handleThemeToggle = () => {
  const next = toggleTheme();
  if (themeBtn) themeBtn.textContent = next === 'dark' ? '🌙' : '☀️';
};

// 2. Scrolled nav class
const mainNav = document.getElementById('main-nav');
if (mainNav) {
  window.addEventListener('scroll', () => {
    mainNav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// 3. Splash (only on index)
const splash = document.getElementById('splash');
if (splash) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 700);
    }, 1800);
  });
}

// 4. Auth-gated nav helper (global)
window.requireAuthNav = async (url) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = `/pages/login.html?redirect=${encodeURIComponent(url)}`;
  } else {
    window.location.href = url;
  }
};

// 5. Update auth-dependent nav items
export async function refreshNavAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  const authBtn    = document.getElementById('auth-btn');
  const acctBottom = document.getElementById('account-bottom');

  if (user) {
    if (authBtn) { authBtn.textContent = '👤'; authBtn.onclick = () => location.href = '/pages/profile.html'; }
    if (acctBottom) acctBottom.href = '/pages/profile.html';
    updateCartBadge();
  } else {
    if (authBtn) { authBtn.textContent = '🔑'; authBtn.onclick = () => location.href = '/pages/login.html'; }
    if (acctBottom) acctBottom.href = '/pages/login.html';
  }
}

refreshNavAuth();
supabase.auth.onAuthStateChange(refreshNavAuth);
