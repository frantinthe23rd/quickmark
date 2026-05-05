import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('file:open'),

  openFilePath: (path: string): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('file:open-path', path),

  saveFile: (path: string, content: string): Promise<void> =>
    ipcRenderer.invoke('file:save', { path, content }),

  saveFileAs: (content: string): Promise<string | null> =>
    ipcRenderer.invoke('file:saveAs', content),

  getRecentFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('file:getRecent'),

  exportPdf: (html: string): Promise<void> =>
    ipcRenderer.invoke('export:pdf', html),

  exportHtml: (html: string): Promise<void> =>
    ipcRenderer.invoke('export:html', html),

  getTheme: (): Promise<{ isDark: boolean; override: 'system' | 'light' | 'dark' }> =>
    ipcRenderer.invoke('theme:get'),

  setTheme: (override: 'system' | 'light' | 'dark'): Promise<boolean> =>
    ipcRenderer.invoke('theme:set', override),

  onMenuAction: (callback: (action: string, payload?: string) => void): (() => void) => {
    const actions = ['new', 'open', 'save', 'saveAs', 'exportPdf', 'exportHtml', 'print']
    actions.forEach(action => ipcRenderer.on(`menu:${action}`, () => callback(action)))
    ipcRenderer.on('menu:openPath', (_, path: string) => callback('openPath', path))
    ipcRenderer.on('menu:toggleAutoSave', (_, enabled: boolean) => callback('toggleAutoSave', String(enabled)))
    return () => {
      actions.forEach(action => ipcRenderer.removeAllListeners(`menu:${action}`))
      ipcRenderer.removeAllListeners('menu:openPath')
      ipcRenderer.removeAllListeners('menu:toggleAutoSave')
    }
  },

  onThemeChange: (callback: (isDark: boolean) => void): (() => void) => {
    ipcRenderer.on('theme:changed', (_, isDark: boolean) => callback(isDark))
    return () => ipcRenderer.removeAllListeners('theme:changed')
  },

  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:open-external', url)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
