'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppTheme = 'dark' | 'light'

type AppThemeContextValue = {
  isDark: boolean
  theme: AppTheme
  toggleTheme: () => void
}

const STORAGE_KEY = 'ops-theme'

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>('dark')

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY)
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const body = document.body

    root.dataset.theme = theme
    body.dataset.theme = theme
    root.classList.toggle('dark', theme === 'dark')

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  const value = useMemo<AppThemeContextValue>(
    () => ({
      isDark: theme === 'dark',
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
      },
    }),
    [theme]
  )

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const context = useContext(AppThemeContext)

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider')
  }

  return context
}
