import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, shell, MenuItem } from 'electron'
import { is } from '@electron-toolkit/utils'

let checkingManually = false
let checkForUpdatesItem: MenuItem | null = null

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

function setCheckItemEnabled(enabled: boolean): void {
  if (checkForUpdatesItem) checkForUpdatesItem.enabled = enabled
}

export function initAutoUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    setCheckItemEnabled(false)
  })

  autoUpdater.on('update-available', (info) => {
    setCheckItemEnabled(true)
    const win = getWindow()
    if (!win) return
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: `QuickMark ${info.version} is available`,
      detail: 'Open the download page to get the latest version.',
      buttons: ['Open Download Page', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) shell.openExternal('https://github.com/frantinthe23rd/quickmark/releases/latest')
    })
  })

  autoUpdater.on('update-not-available', () => {
    setCheckItemEnabled(true)
    if (!checkingManually) return
    checkingManually = false
    const win = getWindow()
    if (!win) return
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'No Updates',
      message: "You're on the latest version of QuickMark.",
      buttons: ['OK']
    })
  })

  autoUpdater.on('error', () => {
    setCheckItemEnabled(true)
    checkingManually = false
  })

  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

export function checkForUpdates(menuItem?: MenuItem): void {
  if (is.dev) return
  if (menuItem) checkForUpdatesItem = menuItem
  checkingManually = true
  autoUpdater.checkForUpdates()
}
