import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<{ path: string; content: string } | null>
      openFilePath: (path: string) => Promise<{ path: string; content: string } | null>
      saveFile: (path: string, content: string) => Promise<void>
      saveFileAs: (content: string) => Promise<string | null>
      getRecentFiles: () => Promise<string[]>
      exportPdf: (html: string) => Promise<void>
      exportHtml: (html: string) => Promise<void>
      getTheme: () => Promise<{ isDark: boolean; override: 'system' | 'light' | 'dark' }>
      setTheme: (override: 'system' | 'light' | 'dark') => Promise<boolean>
      onMenuAction: (callback: (action: string, payload?: string) => void) => () => void
      onThemeChange: (callback: (isDark: boolean) => void) => () => void
      openExternal: (url: string) => Promise<void>
    }
  }
}
