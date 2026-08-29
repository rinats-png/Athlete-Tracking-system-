import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'baseline.theme'

interface ThemeContextValue {
  preference: ThemePreference
  /** Was gerade tatsächlich gerendert wird — auch bei 'system' aufgelöst. */
  resolved: 'light' | 'dark'
  setPreference: (next: ThemePreference) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (preference === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', preference)
    }
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* Speicher nicht verfügbar — Auswahl gilt dann nur für diese Sitzung. */
    }
  }, [preference])

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), [])
  const toggle = useCallback(
    () => setPreferenceState(resolved === 'dark' ? 'light' : 'dark'),
    [resolved],
  )

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme muss innerhalb von <ThemeProvider> benutzt werden')
  return context
}
