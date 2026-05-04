import { Menu, BrowserWindow, dialog, shell, MenuItem } from 'electron'
import { is } from '@electron-toolkit/utils'
import { getRecentFiles } from './store'
import { checkForUpdates } from './updater'

let autoSaveEnabled = true

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
        { label: 'Print…', accelerator: 'CmdOrCtrl+P', click: () => send('menu:print') },
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
        },
        { type: 'separator' },
        {
          label: 'Auto Save',
          type: 'checkbox',
          checked: autoSaveEnabled,
          click: (item) => {
            autoSaveEnabled = item.checked
            BrowserWindow.getFocusedWindow()?.webContents.send('menu:toggleAutoSave', item.checked)
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(is.dev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates…',
          click: (_item, _win, _event, menuItem: MenuItem) => checkForUpdates(menuItem)
        },
        { type: 'separator' },
        {
          label: 'About QuickMark',
          click: async () => {
            const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
            await dialog.showMessageBox(win, {
              title: 'About QuickMark',
              message: 'QuickMark 1.0.0',
              detail: 'A lightweight WYSIWYG markdown editor.\n\nBuilt with Electron, React, and TipTap.',
              buttons: ['OK'],
              type: 'info'
            })
          }
        },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/frantinthe23rd/quickmark')
        }
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
