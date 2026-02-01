import { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeName } from '../contexts/ThemeContext';

const themeIcons: Record<ThemeName, string> = {
  light: '\u2600', // sun
  dark: '\u263D', // moon
  'solarized-light': '\u2600', // sun
  'solarized-dark': '\u263D', // moon
  grayscale: '\u25D0', // circle half
  'high-contrast': '\u25C9', // fisheye
  nord: '\u2744', // snowflake
  dracula: '\u2605', // star
};

export default function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = themes.find((t) => t.name === theme);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-themed-header-muted hover:text-themed-header hover:bg-white/10 transition-colors"
        aria-label="Select theme"
        title={`Current theme: ${currentTheme?.label}`}
      >
        <span className="text-lg">{themeIcons[theme]}</span>
        <span className="hidden sm:inline text-sm">{currentTheme?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg overflow-hidden z-50 bg-themed-card border border-themed">
          <div className="py-1">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setTheme(t.name);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                  theme === t.name
                    ? 'bg-themed-accent text-themed-inverse'
                    : 'text-themed-primary hover:bg-themed-tertiary'
                }`}
              >
                <span className="text-lg w-6 text-center">{themeIcons[t.name]}</span>
                <div>
                  <div className="font-medium">{t.label}</div>
                  <div
                    className={`text-xs ${theme === t.name ? 'opacity-80' : 'text-themed-muted'}`}
                  >
                    {t.description}
                  </div>
                </div>
                {theme === t.name && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
