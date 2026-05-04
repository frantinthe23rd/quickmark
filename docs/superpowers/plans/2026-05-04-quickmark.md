# QuickMark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build QuickMark — a tabbed WYSIWYG markdown editor for Windows with system theme, auto-save, spell check, recent files, and PDF/HTML export.

**Architecture:** Electron main process handles OS operations (file I/O, dialogs, PDF export, menus, persistent JSON store) and communicates with the React renderer via a typed IPC bridge (contextBridge in preload). The renderer uses TipTap 2 for WYSIWYG editing and CodeMirror 6 for source view; `tiptap-markdown` serialises/deserialises between them. A mode flag in `<Editor>` switches views — only one is mounted at a time.

**Tech Stack:** Electron 33, React 18, TypeScript, TipTap 2, tiptap-markdown, CodeMirror 6, codemirror (basicSetup), electron-vite, Electron Builder (NSIS), Vitest, @testing-library/react, GitHub Actions

---

## File Map

### Main process (`src/main/`)
| File | Responsibility |
|---|---|
| `src/main/index.ts` | App lifecycle, window creation, single-instance lock, CLI arg/file-association handling |
| `src/main/ipc.ts` | All `ipcMain` handlers (file ops, export, theme) |
| `src/main/menu.ts` | Application menu (File / Edit / View) |
| `src/main/store.ts` | Simple JSON-based persistent store (recent files, theme override) |

### Preload (`src/preload/`)
| File | Responsibility |
|---|---|
| `src/preload/index.ts` | `contextBridge` exposing typed `window.api` |
| `src/preload/index.d.ts` | TypeScript ambient types for `window.api` |

### Renderer (`src/renderer/src/`)
| File | Responsibility |
|---|---|
| `types.ts` | Shared interfaces: `Tab`, `EditorMode`, `ThemeOverride`, `SaveStatus`, `FileResult` |
| `main.tsx` | Renderer entry — mounts `<App>` |
| `App.tsx` | Root component — wires hooks, handles menu IPC, keyboard shortcuts |
| `App.css` | Global layout (flex column, full height) |
| `styles/themes.css` | CSS custom properties for light and dark palettes |
| `context/ThemeContext.tsx` | System/user theme state; sets `data-theme` on `<html>` |
| `lib/markdown.ts` | `wordCount`, `charCount` (strips markdown syntax) |
| `lib/markdown.test.ts` | Unit tests for markdown utilities |
| `hooks/useTabs.ts` | Tab array state and operations |
| `hooks/useTabs.test.ts` | Unit tests for useTabs |
| `hooks/useFile.ts` | Auto-save debounce + IPC file operations |
| `hooks/useFile.test.ts` | Unit tests for useFile |
| `components/TabBar/TabBar.tsx` | Tab strip with dirty indicator |
| `components/TabBar/TabBar.css` | Tab strip styles |
| `components/Toolbar/Toolbar.tsx` | Formatting buttons, theme toggle, source toggle |
| `components/Toolbar/Toolbar.css` | Toolbar styles |
| `components/Editor/Editor.tsx` | Mode switcher — mounts WysiwygEditor or SourceEditor |
| `components/Editor/Editor.css` | Editor container, ProseMirror styles |
| `components/Editor/WysiwygEditor.tsx` | TipTap instance with markdown extensions |
| `components/Editor/SourceEditor.tsx` | CodeMirror 6 instance |
| `components/StatusBar/StatusBar.tsx` | Word/char count + save status |
| `components/StatusBar/StatusBar.css` | Status bar styles |

### Config & distribution
| File | Responsibility |
|---|---|
| `vitest.config.ts` | Vitest config with jsdom + React |
| `electron-builder.json` | Packaging: NSIS (win), dmg (mac), AppImage/deb (linux), file associations |
| `.github/workflows/ci.yml` | Type-check, test, build on every push |
| `.github/workflows/release.yml` | Build Windows installer and attach to GitHub Release on `v*` tag |
| `README.md` | Project overview, download link, dev setup |

---

## Tasks

### Task 1: Scaffold the project with electron-vite

**Files:**
- Create: entire project from scaffold

- [ ] **Step 1: Scaffold (run from the parent directory `C:/development/projects/`)**

```bash
npm create electron-vite@latest markdown_viewer -- --template react-ts
cd markdown_viewer
```

- [ ] **Step 2: Install additional runtime dependencies**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link tiptap-markdown
npm install codemirror @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/theme-one-dark
npm install uuid
```

- [ ] **Step 3: Install additional dev dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom @types/uuid electron-builder
```

- [ ] **Step 4: Verify the dev server starts**

```bash
npm run dev
```
Expected: Electron window opens showing the default React + Vite template. Close it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold electron-vite react-ts project with all dependencies"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/renderer/src/types.ts`

- [ ] **Step 1: Create `src/renderer/src/types.ts`**

```ts
export interface Tab {
  id: string
  filePath: string | null
  title: string
  isDirty: boolean
  content: string
}

export type EditorMode = 'wysiwyg' | 'source'

export type ThemeOverride = 'system' | 'light' | 'dark'

export type SaveStatus = 'saved' | 'saving' | 'modified' | 'unsaved'

export interface FileResult {
  path: string
  content: string
}

export interface ThemeState {
  isDark: boolean
  override: ThemeOverride
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/types.ts
git commit -m "feat: add shared TypeScript interfaces"
```

---

### Task 3: Main process persistent store

**Files:**
- Create: `src/main/store.ts`

- [ ] **Step 1: Create `src/main/store.ts`**

```ts
import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

interface StoreData {
  recentFiles: string[]
  themeOverride: 'system' | 'light' | 'dark'
}

const DEFAULTS: StoreData = { recentFiles: [], themeOverride: 'system' }

function storePath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function read(): StoreData {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(storePath(), 'utf-8')) }
  } catch {
    return { ...DEFAULTS }
  }
}

function write(data: StoreData): void {
  const p = storePath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

export function getRecentFiles(): string[] {
  return read().recentFiles
}

export function addRecentFile(filePath: string): void {
  const data = read()
  data.recentFiles = [filePath, ...data.recentFiles.filter(f => f !== filePath)].slice(0, 10)
  write(data)
}

export function getThemeOverride(): 'system' | 'light' | 'dark' {
  return read().themeOverride
}

export function setThemeOverride(override: 'system' | 'light' | 'dark'): void {
  const data = read()
  data.themeOverride = override
  write(data)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/store.ts
git commit -m "feat: add JSON persistent store for recent files and theme"
```

---

### Task 4: Main process IPC handlers

**Files:**
- Create: `src/main/ipc.ts`

- [ ] **Step 1: Create `src/main/ipc.ts`**

```ts
import { ipcMain, dialog, BrowserWindow, nativeTheme } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { addRecentFile, getRecentFiles, getThemeOverride, setThemeOverride } from './store'

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

  ipcMain.handle('file:save', (_event, { path, content }: { path: string; content: string }) => {
    writeFileSync(path, content, 'utf-8')
  })

  ipcMain.handle('file:saveAs', async (_event, content: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md'
    })
    if (canceled || !filePath) return null
    writeFileSync(filePath, content, 'utf-8')
    addRecentFile(filePath)
    return filePath
  })

  ipcMain.handle('file:getRecent', () => getRecentFiles())

  ipcMain.handle('export:pdf', async (_event, _html: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      defaultPath: 'export.pdf'
    })
    if (canceled || !filePath) return
    const pdfData = await win.webContents.printToPDF({ printBackground: true })
    writeFileSync(filePath, pdfData)
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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/ipc.ts
git commit -m "feat: add IPC handlers for file ops, PDF/HTML export, and theme"
```

---

### Task 5: Application menu

**Files:**
- Create: `src/main/menu.ts`

- [ ] **Step 1: Create `src/main/menu.ts`**

```ts
import { Menu, BrowserWindow } from 'electron'
import { getRecentFiles } from './store'

function send(channel: string, payload?: string): void {
  BrowserWindow.getFocusedWindow()?.webContents.send(channel, payload)
}

export function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('menu:new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('menu:open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('menu:save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('menu:saveAs') },
        { type: 'separator' },
        { label: 'Recent Files', submenu: buildRecentMenu() },
        { type: 'separator' },
        { label: 'Export as PDF', click: () => send('menu:exportPdf') },
        { label: 'Export as HTML', click: () => send('menu:exportHtml') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Spell Check',
          type: 'checkbox',
          checked: true,
          click: (item) => {
            BrowserWindow.getFocusedWindow()
              ?.webContents.session.setSpellCheckerEnabled(item.checked)
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function buildRecentMenu(): Electron.MenuItemConstructorOptions[] {
  const recents = getRecentFiles()
  if (recents.length === 0) return [{ label: 'No recent files', enabled: false }]
  return recents.map(filePath => ({
    label: filePath,
    click: () => send('menu:openPath', filePath)
  }))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/menu.ts
git commit -m "feat: add application menu with file ops, recent files, and spell check toggle"
```

---

### Task 6: Main process entry point

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Replace the full contents of `src/main/index.ts` with**

```ts
import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { createMenu } from './menu'

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

function createWindow(initialFile?: string): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux'
      ? { icon: join(__dirname, '../../resources/icon.png') }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (initialFile) {
      mainWindow!.webContents.send('menu:openPath', initialFile)
    }
  })

  nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.quickmark.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const initialFile = process.argv.find(
    arg => arg.endsWith('.md') || arg.endsWith('.markdown')
  )

  createWindow(initialFile)
  registerIpcHandlers()
  createMenu()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('second-instance', (_event, argv) => {
  const file = argv.find(arg => arg.endsWith('.md') || arg.endsWith('.markdown'))
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    if (file) mainWindow.webContents.send('menu:openPath', file)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 2: Verify the app still starts**

```bash
npm run dev
```
Expected: App opens. Close it.

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire main process with IPC, menu, single-instance lock, and file-arg handling"
```

---

### Task 7: Preload bridge

**Files:**
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] **Step 1: Replace the full contents of `src/preload/index.ts` with**

```ts
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

  getTheme: (): Promise<{ isDark: boolean; override: string }> =>
    ipcRenderer.invoke('theme:get'),

  setTheme: (override: 'system' | 'light' | 'dark'): Promise<boolean> =>
    ipcRenderer.invoke('theme:set', override),

  onMenuAction: (callback: (action: string, payload?: string) => void): (() => void) => {
    const actions = ['new', 'open', 'save', 'saveAs', 'exportPdf', 'exportHtml']
    actions.forEach(action => ipcRenderer.on(`menu:${action}`, () => callback(action)))
    ipcRenderer.on('menu:openPath', (_, path: string) => callback('openPath', path))
    return () => {
      actions.forEach(action => ipcRenderer.removeAllListeners(`menu:${action}`))
      ipcRenderer.removeAllListeners('menu:openPath')
    }
  },

  onThemeChange: (callback: (isDark: boolean) => void): (() => void) => {
    ipcRenderer.on('theme:changed', (_, isDark: boolean) => callback(isDark))
    return () => ipcRenderer.removeAllListeners('theme:changed')
  }
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
```

- [ ] **Step 2: Replace the full contents of `src/preload/index.d.ts` with**

```ts
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
      getTheme: () => Promise<{ isDark: boolean; override: string }>
      setTheme: (override: 'system' | 'light' | 'dark') => Promise<boolean>
      onMenuAction: (callback: (action: string, payload?: string) => void) => () => void
      onThemeChange: (callback: (isDark: boolean) => void) => () => void
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/preload/
git commit -m "feat: add typed IPC preload bridge via contextBridge"
```

---

### Task 8: Theme system

**Files:**
- Create: `src/renderer/src/styles/themes.css`
- Create: `src/renderer/src/context/ThemeContext.tsx`

- [ ] **Step 1: Create `src/renderer/src/styles/themes.css`**

```css
:root[data-theme='light'] {
  --bg-base: #eff1f5;
  --bg-surface: #ffffff;
  --bg-overlay: #dce0e8;
  --bg-toolbar: #dce0e8;
  --bg-tab-active: #ffffff;
  --bg-tab-inactive: #ccd0da;
  --bg-statusbar: #ccd0da;
  --bg-code: #e6e9ef;
  --text-primary: #4c4f69;
  --text-secondary: #6c6f85;
  --text-heading: #1e1e2e;
  --text-link: #1e66f5;
  --text-code: #d20f39;
  --border: #bcc0cc;
  --accent: #1e66f5;
  --accent-fg: #ffffff;
  --dirty-dot: #fe640b;
  --saved-color: #40a02b;
}

:root[data-theme='dark'] {
  --bg-base: #1e1e2e;
  --bg-surface: #181825;
  --bg-overlay: #313244;
  --bg-toolbar: #1e1e2e;
  --bg-tab-active: #1e1e2e;
  --bg-tab-inactive: #181825;
  --bg-statusbar: #181825;
  --bg-code: #313244;
  --text-primary: #cdd6f4;
  --text-secondary: #a6adc8;
  --text-heading: #ffffff;
  --text-link: #89b4fa;
  --text-code: #f38ba8;
  --border: #313244;
  --accent: #89b4fa;
  --accent-fg: #1e1e2e;
  --dirty-dot: #fab387;
  --saved-color: #a6e3a1;
}
```

- [ ] **Step 2: Create `src/renderer/src/context/ThemeContext.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/styles/ src/renderer/src/context/
git commit -m "feat: add system-following theme with CSS custom properties"
```

---

### Task 9: Markdown utilities + tests

**Files:**
- Create: `vitest.config.ts`
- Create: `src/renderer/src/lib/markdown.ts`
- Create: `src/renderer/src/lib/markdown.test.ts`

- [ ] **Step 1: Create `vitest.config.ts` at project root**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true
  }
})
```

- [ ] **Step 2: Write the failing tests in `src/renderer/src/lib/markdown.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { wordCount, charCount } from './markdown'

describe('wordCount', () => {
  it('counts words in plain text', () => {
    expect(wordCount('hello world foo')).toBe(3)
  })

  it('strips markdown headings before counting', () => {
    expect(wordCount('# Heading\n\n**bold** and *italic*')).toBe(4)
  })

  it('returns 0 for empty string', () => {
    expect(wordCount('')).toBe(0)
  })

  it('handles multiple blank lines', () => {
    expect(wordCount('one\n\n\ntwo')).toBe(2)
  })
})

describe('charCount', () => {
  it('strips bold markers before counting', () => {
    expect(charCount('**bold**')).toBe(4)
  })

  it('returns 0 for empty string', () => {
    expect(charCount('')).toBe(0)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npx vitest run src/renderer/src/lib/markdown.test.ts
```
Expected: FAIL — `Cannot find module './markdown'`

- [ ] **Step 4: Create `src/renderer/src/lib/markdown.ts`**

```ts
export function wordCount(markdown: string): number {
  const text = stripMarkdown(markdown).trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function charCount(markdown: string): number {
  return stripMarkdown(markdown).length
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`{1,3}[^`\n]+`{1,3}/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npx vitest run src/renderer/src/lib/markdown.test.ts
```
Expected: PASS — all 6 tests green

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/renderer/src/lib/
git commit -m "feat: add markdown word/char count utilities with passing tests"
```

---

### Task 10: useTabs hook + tests

**Files:**
- Create: `src/renderer/src/hooks/useTabs.ts`
- Create: `src/renderer/src/hooks/useTabs.test.ts`

- [ ] **Step 1: Write the failing tests in `src/renderer/src/hooks/useTabs.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabs } from './useTabs'

describe('useTabs', () => {
  it('starts with one untitled tab', () => {
    const { result } = renderHook(() => useTabs())
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBeNull()
    expect(result.current.tabs[0].title).toBe('Untitled')
    expect(result.current.tabs[0].isDirty).toBe(false)
  })

  it('openTab adds a tab and activates it', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '# Hello' }))
    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs[1].filePath).toBe('/foo/bar.md')
    expect(result.current.tabs[1].title).toBe('bar.md')
    expect(result.current.activeTabId).toBe(result.current.tabs[1].id)
  })

  it('openTab does not duplicate tabs for the same path', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '' }))
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '' }))
    expect(result.current.tabs).toHaveLength(2)
  })

  it('updateContent marks tab dirty', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.updateContent(id, 'new content'))
    expect(result.current.tabs[0].isDirty).toBe(true)
    expect(result.current.tabs[0].content).toBe('new content')
  })

  it('markSaved clears dirty and updates filePath and title', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.updateContent(id, 'x'))
    act(() => result.current.markSaved(id, '/new/path.md'))
    expect(result.current.tabs[0].isDirty).toBe(false)
    expect(result.current.tabs[0].filePath).toBe('/new/path.md')
    expect(result.current.tabs[0].title).toBe('path.md')
  })

  it('closeTab removes tab and activates adjacent tab', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/a.md', content: '' }))
    const firstId = result.current.tabs[0].id
    act(() => result.current.closeTab(firstId))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBe('/a.md')
  })

  it('closing the last tab replaces it with a fresh untitled tab', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.closeTab(id))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBeNull()
    expect(result.current.tabs[0].id).not.toBe(id)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/renderer/src/hooks/useTabs.test.ts
```
Expected: FAIL — `Cannot find module './useTabs'`

- [ ] **Step 3: Create `src/renderer/src/hooks/useTabs.ts`**

```ts
import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { Tab } from '../types'

function getTitle(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  return filePath.replace(/\\/g, '/').split('/').pop() ?? 'Untitled'
}

function freshTab(): Tab {
  return { id: uuid(), filePath: null, title: 'Untitled', isDirty: false, content: '' }
}

export interface TabsApi {
  tabs: Tab[]
  activeTabId: string
  activeTab: Tab | undefined
  openTab: (file: { path: string; content: string }) => void
  newTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateContent: (id: string, content: string) => void
  markSaved: (id: string, filePath: string) => void
}

export function useTabs(): TabsApi {
  const initial = freshTab()
  const [tabs, setTabs] = useState<Tab[]>([initial])
  const [activeTabId, setActiveTabId] = useState(initial.id)

  const openTab = useCallback((file: { path: string; content: string }) => {
    setTabs(prev => {
      const existing = prev.find(t => t.filePath === file.path)
      if (existing) {
        setActiveTabId(existing.id)
        return prev
      }
      const tab: Tab = {
        id: uuid(),
        filePath: file.path,
        title: getTitle(file.path),
        isDirty: false,
        content: file.content
      }
      setActiveTabId(tab.id)
      return [...prev, tab]
    })
  }, [])

  const newTab = useCallback(() => {
    const tab = freshTab()
    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length === 1) {
        const replacement = freshTab()
        setActiveTabId(replacement.id)
        return [replacement]
      }
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      setActiveTabId(next[Math.min(idx, next.length - 1)].id)
      return next
    })
  }, [])

  const setActiveTab = useCallback((id: string) => setActiveTabId(id), [])

  const updateContent = useCallback((id: string, content: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, content, isDirty: true } : t))
  }, [])

  const markSaved = useCallback((id: string, filePath: string) => {
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...t, isDirty: false, filePath, title: getTitle(filePath) } : t
    ))
  }, [])

  return {
    tabs,
    activeTabId,
    activeTab: tabs.find(t => t.id === activeTabId),
    openTab,
    newTab,
    closeTab,
    setActiveTab,
    updateContent,
    markSaved
  }
}
```

- [ ] **Step 4: Run to confirm all tests pass**

```bash
npx vitest run src/renderer/src/hooks/useTabs.test.ts
```
Expected: PASS — all 7 tests green

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/hooks/useTabs.ts src/renderer/src/hooks/useTabs.test.ts
git commit -m "feat: add useTabs hook with full tab lifecycle and tests"
```

---

### Task 11: useFile hook + tests

**Files:**
- Create: `src/renderer/src/hooks/useFile.ts`
- Create: `src/renderer/src/hooks/useFile.test.ts`

- [ ] **Step 1: Write the failing tests in `src/renderer/src/hooks/useFile.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFile } from './useFile'

const mockApi = {
  openFile: vi.fn(),
  openFilePath: vi.fn(),
  saveFile: vi.fn(),
  saveFileAs: vi.fn(),
  getRecentFiles: vi.fn(),
  exportPdf: vi.fn(),
  exportHtml: vi.fn(),
  getTheme: vi.fn(),
  setTheme: vi.fn(),
  onMenuAction: vi.fn(() => () => {}),
  onThemeChange: vi.fn(() => () => {})
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

describe('useFile auto-save', () => {
  const openTab = vi.fn()
  const markSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockApi.saveFile.mockResolvedValue(undefined)
  })

  afterEach(() => vi.useRealTimers())

  it('saves after 2 seconds of inactivity', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave('/path/file.md', 'hello', 'tab-1'))
    expect(mockApi.saveFile).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(mockApi.saveFile).toHaveBeenCalledWith('/path/file.md', 'hello')
    expect(markSaved).toHaveBeenCalledWith('tab-1', '/path/file.md')
  })

  it('skips save when filePath is null', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave(null, 'hello', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(mockApi.saveFile).not.toHaveBeenCalled()
  })

  it('resets the debounce timer on rapid calls', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave('/file.md', 'v1', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(1500) })
    act(() => result.current.scheduleAutoSave('/file.md', 'v2', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(mockApi.saveFile).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(mockApi.saveFile).toHaveBeenCalledTimes(1)
    expect(mockApi.saveFile).toHaveBeenCalledWith('/file.md', 'v2')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npx vitest run src/renderer/src/hooks/useFile.test.ts
```
Expected: FAIL — `Cannot find module './useFile'`

- [ ] **Step 3: Create `src/renderer/src/hooks/useFile.ts`**

```ts
import { useRef, useCallback } from 'react'
import { Tab } from '../types'

interface UseFileOptions {
  openTab: (file: { path: string; content: string }) => void
  markSaved: (id: string, filePath: string) => void
}

export interface UseFileApi {
  scheduleAutoSave: (filePath: string | null, content: string, tabId?: string) => void
  openFile: () => Promise<void>
  openFilePath: (path: string) => Promise<void>
  saveFile: (tab: Tab) => Promise<void>
  saveFileAs: (tab: Tab) => Promise<string | null>
}

export function useFile({ openTab, markSaved }: UseFileOptions): UseFileApi {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutoSave = useCallback(
    (filePath: string | null, content: string, tabId?: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!filePath) return
      timerRef.current = setTimeout(async () => {
        await window.api.saveFile(filePath, content)
        if (tabId) markSaved(tabId, filePath)
      }, 2000)
    },
    [markSaved]
  )

  const openFile = useCallback(async () => {
    const result = await window.api.openFile()
    if (result) openTab(result)
  }, [openTab])

  const openFilePath = useCallback(async (path: string) => {
    const result = await window.api.openFilePath(path)
    if (result) openTab(result)
  }, [openTab])

  const saveFile = useCallback(async (tab: Tab) => {
    if (!tab.filePath) return
    await window.api.saveFile(tab.filePath, tab.content)
    markSaved(tab.id, tab.filePath)
  }, [markSaved])

  const saveFileAs = useCallback(async (tab: Tab): Promise<string | null> => {
    const newPath = await window.api.saveFileAs(tab.content)
    if (newPath) markSaved(tab.id, newPath)
    return newPath
  }, [markSaved])

  return { scheduleAutoSave, openFile, openFilePath, saveFile, saveFileAs }
}
```

- [ ] **Step 4: Run to confirm all tests pass**

```bash
npx vitest run src/renderer/src/hooks/useFile.test.ts
```
Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/hooks/useFile.ts src/renderer/src/hooks/useFile.test.ts
git commit -m "feat: add useFile hook with 2-second debounced auto-save and tests"
```

---

### Task 12: WysiwygEditor component

**Files:**
- Create: `src/renderer/src/components/Editor/WysiwygEditor.tsx`

- [ ] **Step 1: Create `src/renderer/src/components/Editor/WysiwygEditor.tsx`**

```tsx
import { useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'

interface WysiwygEditorProps {
  content: string
  onChange: (markdown: string) => void
  editorRef?: (editor: Editor | null) => void
}

export function WysiwygEditor({ content, onChange, editorRef }: WysiwygEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Markdown.configure({ html: false, transformCopiedText: true })
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.storage.markdown.getMarkdown())
    }
  })

  useEffect(() => {
    editorRef?.(editor ?? null)
    return () => editorRef?.(null)
  }, [editor, editorRef])

  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== content) {
      editor.commands.setContent(content)
    }
  }, [content]) // only re-sync when content changes externally (tab switch)

  return (
    <div className="wysiwyg-editor">
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Editor/WysiwygEditor.tsx
git commit -m "feat: add TipTap WYSIWYG editor with tiptap-markdown serialization"
```

---

### Task 13: SourceEditor component

**Files:**
- Create: `src/renderer/src/components/Editor/SourceEditor.tsx`

- [ ] **Step 1: Create `src/renderer/src/components/Editor/SourceEditor.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

interface SourceEditorProps {
  content: string
  onChange: (markdown: string) => void
  isDark: boolean
}

export function SourceEditor({ content, onChange, isDark }: SourceEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          markdown(),
          ...(isDark ? [oneDark] : []),
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChange(update.state.doc.toString())
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': { fontFamily: 'ui-monospace, monospace', overflow: 'auto' }
          })
        ]
      }),
      parent: containerRef.current
    })

    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [isDark]) // recreate on theme change; content synced separately

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: content } })
    }
  }, [content])

  return <div ref={containerRef} className="source-editor" style={{ height: '100%' }} />
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/Editor/SourceEditor.tsx
git commit -m "feat: add CodeMirror 6 source editor with markdown highlighting"
```

---

### Task 14: Editor mode switcher

**Files:**
- Create: `src/renderer/src/components/Editor/Editor.tsx`
- Create: `src/renderer/src/components/Editor/Editor.css`

- [ ] **Step 1: Create `src/renderer/src/components/Editor/Editor.tsx`**

```tsx
import { Editor as TipTapEditor } from '@tiptap/react'
import { WysiwygEditor } from './WysiwygEditor'
import { SourceEditor } from './SourceEditor'
import { EditorMode } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import './Editor.css'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  mode: EditorMode
  editorRef?: (editor: TipTapEditor | null) => void
}

export function Editor({ content, onChange, mode, editorRef }: EditorProps): JSX.Element {
  const { isDark } = useTheme()

  return (
    <div className="editor-container">
      {mode === 'wysiwyg' ? (
        <WysiwygEditor content={content} onChange={onChange} editorRef={editorRef} />
      ) : (
        <SourceEditor content={content} onChange={onChange} isDark={isDark} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/renderer/src/components/Editor/Editor.css`**

```css
.editor-container {
  flex: 1;
  overflow: auto;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
}

.wysiwyg-editor {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 32px;
  min-height: 100%;
  width: 100%;
}

.wysiwyg-editor .ProseMirror {
  outline: none;
  color: var(--text-primary);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.75;
  min-height: 200px;
}

.wysiwyg-editor .ProseMirror h1 { font-size: 2em; font-weight: 700; color: var(--text-heading); margin: 0.67em 0; }
.wysiwyg-editor .ProseMirror h2 { font-size: 1.5em; font-weight: 600; color: var(--text-heading); border-bottom: 1px solid var(--border); padding-bottom: 0.3em; margin: 0.83em 0; }
.wysiwyg-editor .ProseMirror h3 { font-size: 1.17em; font-weight: 600; color: var(--text-heading); }
.wysiwyg-editor .ProseMirror a { color: var(--text-link); }
.wysiwyg-editor .ProseMirror code { background: var(--bg-code); color: var(--text-code); padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 0.9em; }
.wysiwyg-editor .ProseMirror pre { background: var(--bg-code); padding: 16px; border-radius: 6px; overflow: auto; }
.wysiwyg-editor .ProseMirror pre code { background: none; padding: 0; color: var(--text-primary); }
.wysiwyg-editor .ProseMirror blockquote { border-left: 4px solid var(--accent); margin: 0; padding-left: 16px; color: var(--text-secondary); font-style: italic; }
.wysiwyg-editor .ProseMirror ul, .wysiwyg-editor .ProseMirror ol { padding-left: 24px; }
.wysiwyg-editor .ProseMirror hr { border: none; border-top: 2px solid var(--border); margin: 24px 0; }
.wysiwyg-editor .ProseMirror p.is-empty:first-child::before {
  content: 'Start writing…';
  color: var(--text-secondary);
  pointer-events: none;
  float: left;
  height: 0;
}

.source-editor {
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Editor/
git commit -m "feat: add Editor mode switcher with WYSIWYG and source views"
```

---

### Task 15: TabBar component

**Files:**
- Create: `src/renderer/src/components/TabBar/TabBar.tsx`
- Create: `src/renderer/src/components/TabBar/TabBar.css`

- [ ] **Step 1: Create `src/renderer/src/components/TabBar/TabBar.tsx`**

```tsx
import { Tab } from '../../types'
import './TabBar.css'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: TabBarProps): JSX.Element {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className={`tab ${tab.id === activeTabId ? 'tab--active' : ''}`}
          onClick={() => onSelect(tab.id)}
          title={tab.filePath ?? 'Untitled'}
        >
          {tab.isDirty && <span className="tab__dirty" aria-label="unsaved" />}
          <span className="tab__title">{tab.title}</span>
          <button
            className="tab__close"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
            aria-label={`Close ${tab.title}`}
          >
            ×
          </button>
        </div>
      ))}
      <button className="tab-bar__new" onClick={onNew} aria-label="New file" title="New file (Ctrl+N)">
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/renderer/src/components/TabBar/TabBar.css`**

```css
.tab-bar {
  display: flex;
  align-items: stretch;
  background: var(--bg-tab-inactive);
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-bar::-webkit-scrollbar { height: 3px; }
.tab-bar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-tab-inactive);
  border-right: 1px solid var(--border);
  cursor: pointer;
  min-width: 80px;
  max-width: 200px;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-secondary);
  user-select: none;
  transition: background 0.1s;
}

.tab--active {
  background: var(--bg-tab-active);
  color: var(--text-primary);
}

.tab__dirty {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dirty-dot);
  flex-shrink: 0;
}

.tab__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab__close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.tab:hover .tab__close,
.tab--active .tab__close { opacity: 1; }
.tab__close:hover { color: var(--text-primary); }

.tab-bar__new {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 20px;
  padding: 0 14px;
  line-height: 1;
  flex-shrink: 0;
}
.tab-bar__new:hover { color: var(--text-primary); }
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/TabBar/
git commit -m "feat: add TabBar component with dirty indicator and close buttons"
```

---

### Task 16: Toolbar component

**Files:**
- Create: `src/renderer/src/components/Toolbar/Toolbar.tsx`
- Create: `src/renderer/src/components/Toolbar/Toolbar.css`

- [ ] **Step 1: Create `src/renderer/src/components/Toolbar/Toolbar.tsx`**

```tsx
import { Editor } from '@tiptap/react'
import { EditorMode, ThemeOverride } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import './Toolbar.css'

interface ToolbarProps {
  editor: Editor | null
  mode: EditorMode
  onModeToggle: () => void
}

interface FormatAction {
  label: string
  title: string
  action: (e: Editor) => void
  isActive?: (e: Editor) => boolean
}

const FORMAT: FormatAction[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', action: e => e.chain().focus().toggleBold().run(), isActive: e => e.isActive('bold') },
  { label: 'I', title: 'Italic (Ctrl+I)', action: e => e.chain().focus().toggleItalic().run(), isActive: e => e.isActive('italic') },
  { label: 'S', title: 'Strikethrough', action: e => e.chain().focus().toggleStrike().run(), isActive: e => e.isActive('strike') }
]

const HEADINGS: FormatAction[] = ([1, 2, 3] as const).map(level => ({
  label: `H${level}`,
  title: `Heading ${level}`,
  action: e => e.chain().focus().toggleHeading({ level }).run(),
  isActive: e => e.isActive('heading', { level })
}))

const BLOCKS: FormatAction[] = [
  { label: '≡', title: 'Bullet list', action: e => e.chain().focus().toggleBulletList().run(), isActive: e => e.isActive('bulletList') },
  { label: '1≡', title: 'Ordered list', action: e => e.chain().focus().toggleOrderedList().run(), isActive: e => e.isActive('orderedList') },
  { label: '"', title: 'Blockquote', action: e => e.chain().focus().toggleBlockquote().run(), isActive: e => e.isActive('blockquote') }
]

const INSERTS: FormatAction[] = [
  { label: '</>', title: 'Code block', action: e => e.chain().focus().toggleCodeBlock().run(), isActive: e => e.isActive('codeBlock') },
  { label: '━', title: 'Horizontal rule', action: e => e.chain().focus().setHorizontalRule().run() }
]

const THEME_CYCLE: Record<ThemeOverride, ThemeOverride> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON: Record<ThemeOverride, string> = { system: '⊙', light: '☾', dark: '☀' }

function Btn({ label, title, active, disabled, onClick }: {
  label: string; title: string; active?: boolean; disabled?: boolean; onClick: () => void
}): JSX.Element {
  return (
    <button
      className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >{label}</button>
  )
}

function Divider(): JSX.Element {
  return <div className="toolbar__divider" />
}

export function Toolbar({ editor, mode, onModeToggle }: ToolbarProps): JSX.Element {
  const { override, setOverride } = useTheme()
  const wysiwyg = mode === 'wysiwyg'
  const disabled = !editor || !wysiwyg

  const btns = (actions: FormatAction[]): JSX.Element[] =>
    actions.map(({ label, title, action, isActive }) => (
      <Btn
        key={label}
        label={label}
        title={title}
        active={!disabled && !!isActive?.(editor!)}
        disabled={disabled}
        onClick={() => editor && action(editor)}
      />
    ))

  return (
    <div className="toolbar">
      {btns(FORMAT)}
      <Divider />
      {btns(HEADINGS)}
      <Divider />
      {btns(BLOCKS)}
      <Divider />
      {btns(INSERTS)}
      <div className="toolbar__spacer" />
      <Btn label={THEME_ICON[override]} title={`Theme: ${override} (click to cycle)`} onClick={() => setOverride(THEME_CYCLE[override])} />
      <Btn
        label={wysiwyg ? '⌨ Source' : '◉ WYSIWYG'}
        title="Toggle source view (Ctrl+Shift+S)"
        active={!wysiwyg}
        onClick={onModeToggle}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `src/renderer/src/components/Toolbar/Toolbar.css`**

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px 10px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.toolbar__btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  min-width: 28px;
  transition: background 0.1s, border-color 0.1s;
}
.toolbar__btn:hover:not(:disabled) { background: var(--bg-overlay); border-color: var(--border); }
.toolbar__btn--active { background: var(--accent); color: var(--accent-fg); border-color: var(--accent); }
.toolbar__btn--active:hover:not(:disabled) { background: var(--accent); }
.toolbar__btn:disabled { opacity: 0.4; cursor: default; }

.toolbar__divider { width: 1px; height: 20px; background: var(--border); margin: 0 4px; flex-shrink: 0; }
.toolbar__spacer { flex: 1; }
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/Toolbar/
git commit -m "feat: add Toolbar with formatting buttons, theme cycle, and source toggle"
```

---

### Task 17: StatusBar component

**Files:**
- Create: `src/renderer/src/components/StatusBar/StatusBar.tsx`
- Create: `src/renderer/src/components/StatusBar/StatusBar.css`

- [ ] **Step 1: Create `src/renderer/src/components/StatusBar/StatusBar.tsx`**

```tsx
import { useMemo } from 'react'
import { SaveStatus } from '../../types'
import { wordCount, charCount } from '../../lib/markdown'
import './StatusBar.css'

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: '✓ Saved',
  saving: '⟳ Saving…',
  modified: '● Modified',
  unsaved: '● Unsaved'
}

interface StatusBarProps {
  content: string
  saveStatus: SaveStatus
}

export function StatusBar({ content, saveStatus }: StatusBarProps): JSX.Element {
  const words = useMemo(() => wordCount(content), [content])
  const chars = useMemo(() => charCount(content), [content])

  return (
    <div className="status-bar">
      <span className={`status-bar__save status-bar__save--${saveStatus}`}>
        {STATUS_LABEL[saveStatus]}
      </span>
      <span className="status-bar__counts">
        {words} {words === 1 ? 'word' : 'words'} · {chars.toLocaleString()} characters
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/renderer/src/components/StatusBar/StatusBar.css`**

```css
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 14px;
  background: var(--bg-statusbar);
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  user-select: none;
}

.status-bar__save--saved   { color: var(--saved-color); }
.status-bar__save--saving  { color: var(--text-secondary); }
.status-bar__save--modified,
.status-bar__save--unsaved { color: var(--dirty-dot); }
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/StatusBar/
git commit -m "feat: add StatusBar with live word count and save status"
```

---

### Task 18: App assembly

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/App.css`
- Modify: `src/renderer/src/main.tsx`

- [ ] **Step 1: Replace the full contents of `src/renderer/src/App.tsx` with**

```tsx
import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor as TipTapEditor } from '@tiptap/react'
import { ThemeProvider } from './context/ThemeContext'
import { TabBar } from './components/TabBar/TabBar'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Editor } from './components/Editor/Editor'
import { StatusBar } from './components/StatusBar/StatusBar'
import { useTabs } from './hooks/useTabs'
import { useFile } from './hooks/useFile'
import { EditorMode, SaveStatus } from './types'
import './App.css'
import './styles/themes.css'

function AppInner(): JSX.Element {
  const {
    tabs, activeTabId, activeTab,
    openTab, newTab, closeTab, setActiveTab, updateContent, markSaved
  } = useTabs()

  const [mode, setMode] = useState<EditorMode>('wysiwyg')
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({})
  const tiptapRef = useRef<TipTapEditor | null>(null)

  const resolveStatus = (tabId: string): SaveStatus => {
    if (saveStatuses[tabId]) return saveStatuses[tabId]
    const tab = tabs.find(t => t.id === tabId)
    return tab?.isDirty ? 'modified' : 'saved'
  }

  const onMarkSaved = useCallback((id: string, filePath: string) => {
    markSaved(id, filePath)
    setSaveStatuses(s => ({ ...s, [id]: 'saved' }))
  }, [markSaved])

  const { scheduleAutoSave, openFile, openFilePath, saveFile, saveFileAs } = useFile({
    openTab,
    markSaved: onMarkSaved
  })

  const handleContentChange = useCallback((content: string) => {
    if (!activeTab) return
    updateContent(activeTab.id, content)
    setSaveStatuses(s => ({ ...s, [activeTab.id]: 'saving' }))
    scheduleAutoSave(activeTab.filePath, content, activeTab.id)
  }, [activeTab, updateContent, scheduleAutoSave])

  const handleSave = useCallback(async () => {
    if (!activeTab) return
    if (activeTab.filePath) await saveFile(activeTab)
    else await saveFileAs(activeTab)
  }, [activeTab, saveFile, saveFileAs])

  const handleSaveAs = useCallback(async () => {
    if (activeTab) await saveFileAs(activeTab)
  }, [activeTab, saveFileAs])

  const handleExportPdf = useCallback(async () => {
    if (tiptapRef.current) await window.api.exportPdf(tiptapRef.current.getHTML())
  }, [])

  const handleExportHtml = useCallback(async () => {
    if (tiptapRef.current) await window.api.exportHtml(tiptapRef.current.getHTML())
  }, [])

  const toggleMode = useCallback(() => {
    setMode(m => m === 'wysiwyg' ? 'source' : 'wysiwyg')
  }, [])

  useEffect(() => {
    const cleanup = window.api.onMenuAction(async (action, payload) => {
      if (action === 'new') newTab()
      else if (action === 'open') await openFile()
      else if (action === 'openPath' && payload) await openFilePath(payload)
      else if (action === 'save') await handleSave()
      else if (action === 'saveAs') await handleSaveAs()
      else if (action === 'exportPdf') await handleExportPdf()
      else if (action === 'exportHtml') await handleExportHtml()
    })
    return cleanup
  }, [newTab, openFile, openFilePath, handleSave, handleSaveAs, handleExportPdf, handleExportHtml])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        toggleMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleMode])

  return (
    <div className="app">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTab}
        onClose={closeTab}
        onNew={newTab}
      />
      <Toolbar
        editor={tiptapRef.current}
        mode={mode}
        onModeToggle={toggleMode}
      />
      {activeTab && (
        <Editor
          content={activeTab.content}
          onChange={handleContentChange}
          mode={mode}
          editorRef={e => { tiptapRef.current = e }}
        />
      )}
      <StatusBar
        content={activeTab?.content ?? ''}
        saveStatus={activeTab ? resolveStatus(activeTab.id) : 'saved'}
      />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Replace the full contents of `src/renderer/src/App.css` with**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  overflow: hidden;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
```

- [ ] **Step 3: Replace the full contents of `src/renderer/src/main.tsx` with**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 4: Run the app and verify end-to-end**

```bash
npm run dev
```

Walk through these checks:
1. App opens with one "Untitled" tab
2. Typing in the editor updates word count in the status bar
3. Selecting text and pressing Ctrl+B makes it bold
4. Ctrl+Shift+S toggles source view — raw markdown visible
5. Switching back to WYSIWYG shows rendered content
6. Clicking `+` opens a second "Untitled" tab
7. File → Open opens a file dialog; selected `.md` file opens in a new tab
8. Editing a file shows orange dot on the tab after 2 seconds without typing; status bar shows "Saved"
9. Theme toggle (⊙ button) cycles through system / light / dark

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/
git commit -m "feat: assemble full app — tabs, editor, toolbar, status bar, menu integration"
```

---

### Task 19: Electron Builder config + icons

**Files:**
- Create: `electron-builder.json`
- Create: `resources/icon.png` (placeholder)
- Modify: `package.json` (add build scripts)
- Modify: `.gitignore`

- [ ] **Step 1: Add a placeholder icon**

Place any 512×512 PNG at `resources/icon.png`. If you have `electron-icon-builder` available, generate proper platform icons:

```bash
npm install --save-dev electron-icon-builder
npx electron-icon-builder --input=resources/icon.png --output=resources
```

This creates `resources/icons/` with `.ico` (Windows) and `.icns` (macOS). Without this step the build still works using default Electron icons — add proper icons before the first public release.

- [ ] **Step 2: Create `electron-builder.json`**

```json
{
  "appId": "com.quickmark.app",
  "productName": "QuickMark",
  "directories": {
    "output": "dist"
  },
  "files": [
    "out/**/*"
  ],
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64"] }],
    "icon": "resources/icon.ico"
  },
  "mac": {
    "target": [{ "target": "dmg", "arch": ["x64", "arm64"] }],
    "icon": "resources/icon.icns"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "icon": "resources/icons"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "fileAssociations": [
    { "ext": "md", "name": "Markdown File", "role": "Editor", "icon": "resources/icon.ico" },
    { "ext": "markdown", "name": "Markdown File", "role": "Editor", "icon": "resources/icon.ico" }
  ],
  "publish": [{ "provider": "github", "releaseType": "release" }]
}
```

- [ ] **Step 3: Add build scripts to `package.json`**

Open `package.json` and add the following to the `"scripts"` object:

```json
"build:win": "npm run build && electron-builder --win",
"build:mac": "npm run build && electron-builder --mac",
"build:linux": "npm run build && electron-builder --linux",
"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.web.json"
```

- [ ] **Step 4: Append to `.gitignore`**

```
dist/
.superpowers/
```

- [ ] **Step 5: Verify the Windows build works**

```bash
npm run build:win
```
Expected: `dist/QuickMark Setup 1.0.0.exe` created. Run it and verify QuickMark installs and opens.

- [ ] **Step 6: Commit**

```bash
git add electron-builder.json package.json .gitignore resources/
git commit -m "chore: add Electron Builder config with NSIS installer and .md file association"
```

---

### Task 20: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: ['**']

jobs:
  ci:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Run unit tests
        run: npx vitest run

      - name: Build
        run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for type-check, tests, and build"
```

---

### Task 21: GitHub Actions release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build and package Windows installer
        run: npm run build:win
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Attach installer to GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*.exe
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow to publish Windows installer on version tags"
```

---

### Task 22: GitHub repo setup and README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# QuickMark

A lightweight WYSIWYG markdown editor for Windows. Open `.md` files directly, edit with formatting buttons, and save automatically.

## Features

- **WYSIWYG editing** — bold, italic, headings, lists, links, and more via toolbar; no markdown syntax in the way
- **Source toggle** — view and edit raw markdown at any time (Ctrl+Shift+S)
- **Tabbed interface** — open multiple files at once
- **Auto-save** — saves 2 seconds after your last keystroke
- **System theme** — follows Windows light/dark mode; cycle manually with the toolbar toggle
- **Spell check** — OS-level spell checking built in
- **Recent files** — File → Recent Files for quick access
- **Export** — File → Export as PDF or Export as HTML

## Download

Grab the latest Windows installer from [Releases](../../releases).

## Development

Requires [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/jonmoseley3/quickmark.git
cd quickmark
npm install
npm run dev
```

### Build Windows installer

```bash
npm run build:win
# Output: dist/QuickMark Setup *.exe
```

### Run tests

```bash
npx vitest run
```

## Tech stack

Electron · React 18 · TypeScript · TipTap 2 · CodeMirror 6 · Vite · Electron Builder

## Licence

[MIT](LICENSE)
```

- [ ] **Step 2: Create the GitHub repo and push**

```bash
gh repo create quickmark --public --description "Lightweight WYSIWYG markdown editor for Windows"
git remote add origin https://github.com/jonmoseley3/quickmark.git
git push -u origin master
```

- [ ] **Step 3: Verify the repo is live**

Open `https://github.com/jonmoseley3/quickmark` — README should render.

- [ ] **Step 4: Commit README and push**

```bash
git add README.md
git commit -m "docs: add README with features, download link, and dev instructions"
git push
```

---

## Spec Coverage Check

| Requirement | Task(s) |
|---|---|
| WYSIWYG editor with formatting toolbar | 12, 16 |
| Source toggle (Ctrl+Shift+S) | 14, 16, 18 |
| Tabbed interface (multiple files) | 10, 15, 18 |
| Follow system theme (light/dark) | 8, 16 |
| Auto-save (2s debounce) | 11, 18 |
| Word / character count | 9, 17 |
| Spell check | 4 (`spellcheck: true`), 5 (Edit menu toggle) |
| Recent files (max 10) | 3, 4, 5 |
| Export to PDF | 4, 18 |
| Export to HTML | 4, 18 |
| `.md` file association | 6, 19 |
| NSIS installer | 19 |
| Cross-platform build config (mac, linux) | 19 |
| Single-instance + file-from-CLI-arg | 6 |
| GitHub public repo | 22 |
| GitHub Actions CI | 20 |
| GitHub Actions release (attach installer) | 21 |
