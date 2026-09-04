'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'oled' | 'system';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark' | 'oled';
  setMode: (mode: ThemeMode) => void;
  outdoorMode: boolean;
  setOutdoorMode: (enabled: boolean) => void;
  ruggedMode: boolean;
  setRuggedMode: (enabled: boolean) => void;
  batterySaverMode: boolean;
  setBatterySaverMode: (enabled: boolean) => void;
}

const STORAGE_KEY = 'theme-preference';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'oled' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function applyTheme(theme: 'light' | 'dark' | 'oled') {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (theme === 'dark' || theme === 'oled') {
    root.classList.add('dark');
    if (theme === 'oled') {
      root.classList.add('oled');
    } else {
      root.classList.remove('oled');
    }
  } else {
    root.classList.remove('dark');
    root.classList.remove('oled');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'oled'>('light');
  const [outdoorMode, setOutdoorModeState] = useState<boolean>(false);
  const [ruggedMode, setRuggedModeState] = useState<boolean>(false);
  const [batterySaverMode, setBatterySaverModeState] = useState<boolean>(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedMode = getStoredMode();
    setModeState(storedMode);

    const storedOutdoor = localStorage.getItem('theme-outdoor-mode') === 'true';
    setOutdoorModeState(storedOutdoor);
    if (storedOutdoor) {
      document.documentElement.classList.add('outdoor');
    }

    const storedRugged = localStorage.getItem('theme-rugged-mode') === 'true';
    setRuggedModeState(storedRugged);
    if (storedRugged) {
      document.documentElement.classList.add('rugged-mode');
    }

    const storedBattery = localStorage.getItem('theme-battery-saver') === 'true';
    setBatterySaverModeState(storedBattery);
    if (storedBattery) {
      document.documentElement.classList.add('battery-saver');
    }

    // Auto-detect battery level if supported by mobile browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((battery: { level: number; charging: boolean }) => {
        if (battery.level <= 0.2 && !battery.charging && !storedBattery) {
          setBatterySaverModeState(true);
          document.documentElement.classList.add('battery-saver');
        }
      }).catch(() => {});
    }

    const resolved = storedMode === 'system' ? getSystemTheme() : storedMode;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia(MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);

    const resolved = newMode === 'system' ? getSystemTheme() : newMode;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  const setOutdoorMode = useCallback((enabled: boolean) => {
    setOutdoorModeState(enabled);
    localStorage.setItem('theme-outdoor-mode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('outdoor');
    } else {
      document.documentElement.classList.remove('outdoor');
    }
  }, []);

  const setRuggedMode = useCallback((enabled: boolean) => {
    setRuggedModeState(enabled);
    localStorage.setItem('theme-rugged-mode', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('rugged-mode');
    } else {
      document.documentElement.classList.remove('rugged-mode');
    }
  }, []);

  const setBatterySaverMode = useCallback((enabled: boolean) => {
    setBatterySaverModeState(enabled);
    localStorage.setItem('theme-battery-saver', String(enabled));
    if (enabled) {
      document.documentElement.classList.add('battery-saver');
    } else {
      document.documentElement.classList.remove('battery-saver');
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      outdoorMode,
      setOutdoorMode,
      ruggedMode,
      setRuggedMode,
      batterySaverMode,
      setBatterySaverMode,
    }),
    [mode, resolvedTheme, setMode, outdoorMode, setOutdoorMode, ruggedMode, setRuggedMode, batterySaverMode, setBatterySaverMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
