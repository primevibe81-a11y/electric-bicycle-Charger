/**
 * Theme Manager for E-Bike Gadai (Light / Dark Mode)
 * Persists theme preference to localStorage and updates `document.documentElement`.
 */

const STORAGE_KEY = 'ebike_theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Check system preference if no saved setting
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    // Fallback if localStorage blocked
  }
  return 'light';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Update mobile status bar theme-color dynamically
  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', isDark ? '#0B0F17' : '#F4F8FB');

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    // localStorage might be full or restricted
  }
}

export function toggleTheme() {
  const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}
