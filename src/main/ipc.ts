import { ipcMain, dialog, BrowserWindow, nativeTheme, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { addRecentFile, getRecentFiles, getThemeOverride, setThemeOverride } from './store'
import { createMenu, setAutoSaveEnabled } from './menu'

export function registerIpcHandlers(): void {
  ipcMain.handle('file:open', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    const path = filePaths[0]
    const content = readFileSync(path, 'utf-8')
    addRecentFile(path)
    createMenu()
    return { path, content }
  })

  ipcMain.handle('file:open-path', (_event, filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf-8')
      addRecentFile(filePath)
      return { path: filePath, content }
    } catch {
      return null
    }
  })

  ipcMain.handle('file:save', (
    _event,
    { path, content, requireExisting }: { path: string; content: string; requireExisting?: boolean }
  ) => {
    if (requireExisting && !existsSync(path)) {
      return { ok: false, reason: 'missing' as const }
    }
    try {
      writeFileSync(path, content, 'utf-8')
      return { ok: true as const }
    } catch (err) {
      console.error('Save failed:', err)
      throw err
    }
  })

  ipcMain.handle('autosave:set', (_event, enabled: boolean) => {
    setAutoSaveEnabled(enabled)
  })

  ipcMain.handle('file:saveAs', async (_event, content: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md'
    })
    if (canceled || !filePath) return null
    try {
      writeFileSync(filePath, content, 'utf-8')
    } catch (err) {
      console.error('Save As failed:', err)
      throw err
    }
    addRecentFile(filePath)
    createMenu()
    return filePath
  })

  ipcMain.handle('file:getRecent', () => getRecentFiles())

  ipcMain.handle('export:pdf', async (_event, html: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: 'export.pdf'
    })
    if (canceled || !filePath) return
    try {
      const offscreen = new BrowserWindow({ show: false, webPreferences: { javascript: false } })
      await offscreen.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      const pdfData = await offscreen.webContents.printToPDF({ printBackground: true })
      offscreen.close()
      writeFileSync(filePath, pdfData)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
  })

  ipcMain.handle('export:html', async (_event, html: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'HTML', extensions: ['html'] }],
      defaultPath: 'export.html'
    })
    if (canceled || !filePath) return
    const full = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title><style>',
      'body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7}',
      'h1,h2,h3{font-weight:600}',
      'code{background:#f3f4f6;padding:2px 6px;border-radius:3px}',
      'pre{background:#f3f4f6;padding:16px;border-radius:6px;overflow:auto}',
      'blockquote{border-left:4px solid #d1d5db;margin:0;padding-left:16px;color:#6b7280}',
      '</style></head><body>',
      html,
      '</body></html>'
    ].join('')
    writeFileSync(filePath, full, 'utf-8')
  })

  ipcMain.handle('theme:get', () => ({
    isDark: nativeTheme.shouldUseDarkColors,
    override: getThemeOverride()
  }))

  ipcMain.handle('theme:set', (_event, override: 'system' | 'light' | 'dark') => {
    setThemeOverride(override)
    nativeTheme.themeSource = override
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return
    try {
      await shell.openExternal(url)
    } catch (err) {
      console.error('shell.openExternal failed:', err)
    }
  })
}
