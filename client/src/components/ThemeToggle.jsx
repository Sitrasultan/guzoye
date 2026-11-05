import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return <button type="button" className={compact ? 'theme-toggle compact' : 'theme-toggle'} onClick={() => setTheme(next)} aria-label={`Theme: ${theme}. Switch to ${next}.`}><Icon size={16} />{!compact && <span>{theme}</span>}</button>;
}
