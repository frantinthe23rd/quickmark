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
