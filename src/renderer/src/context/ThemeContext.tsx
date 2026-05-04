import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ThemeOverride } from '../types'

interface ThemeContextValue {
  isDark: boolean
  override: ThemeOverride
  setOverride: (override: ThemeOverride) => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  override: 'system',
  setOverride: async () => {}
})

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isDark, setIsDark] = useState(false)
  const [override, setOverrideState] = useState<ThemeOverride>('system')

  useEffect(() => {
    window.api.getTheme().then(({ isDark: d, override: o }) => {
      setIsDark(d)
      setOverrideState(o as ThemeOverride)
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light')
    })

    const cleanup = window.api.onThemeChange((dark) => {
      setIsDark(dark)
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    })

    return cleanup
  }, [])

  const setOverride = async (o: ThemeOverride): Promise<void> => {
    const dark = await window.api.setTheme(o)
    setIsDark(dark)
    setOverrideState(o)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ isDark, override, setOverride }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => useContext(ThemeContext)
