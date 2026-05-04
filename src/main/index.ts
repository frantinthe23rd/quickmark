import { app, BrowserWindow, nativeTheme, Menu, MenuItem } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc'
import { createMenu } from './menu'
import { initAutoUpdater } from './updater'

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
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

  mainWindow.webContents.on('context-menu', (_event, params) => {
    const menu = new Menu()

    // Spell-check suggestions
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => mainWindow!.webContents.replaceMisspelling(suggestion)
      }))
    }

    if (params.misspelledWord) {
      menu.append(new MenuItem({ type: 'separator' }))
      menu.append(new MenuItem({
        label: 'Add to Dictionary',
        click: () => mainWindow!.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }))
    }

    // Separator before edit actions when spell items are present
    if (params.dictionarySuggestions.length > 0 || params.misspelledWord) {
      menu.append(new MenuItem({ type: 'separator' }))
    }

    // Standard edit actions — only show what's applicable
    if (params.isEditable) {
      if (params.editFlags.canCut) menu.append(new MenuItem({ label: 'Cut', role: 'cut' }))
      if (params.editFlags.canCopy) menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
      if (params.editFlags.canPaste) menu.append(new MenuItem({ label: 'Paste', role: 'paste' }))
    } else if (params.editFlags.canCopy) {
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }))
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow! })
    }
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
  initAutoUpdater()

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
