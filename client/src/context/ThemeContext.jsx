import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { travelerApi } from '../services/traveler';
const ThemeContext = createContext(null);
function initialTheme() {
  const stored = localStorage.getItem('guzoye-theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
function applyTheme(theme) {
  const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
}
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('guzoye-theme', theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => { if (theme === 'system') applyTheme(theme); };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);
  const changeTheme = useCallback(async next => {
    setTheme(next);
    try { await travelerApi.updateProfile({ theme: next }); } catch { /* localStorage fallback remains */ }
  }, []);
  return <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider.');
  return context;
}
