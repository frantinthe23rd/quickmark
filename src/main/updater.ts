import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog, MenuItem } from 'electron'
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
  autoUpdater.autoInstallOnAppQuit = true

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
      detail: 'Download now and install when you next quit?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate()
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

  autoUpdater.on('update-downloaded', () => {
    setCheckItemEnabled(true)
    const win = getWindow()
    if (!win) return
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded.',
      detail: 'Restart QuickMark to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })

  autoUpdater.on('error', () => {
    setCheckItemEnabled(true)
    checkingManually = false
  })

  // Check after launch without blocking startup
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}

export function checkForUpdates(menuItem?: MenuItem): void {
  if (is.dev) return
  if (menuItem) checkForUpdatesItem = menuItem
  checkingManually = true
  autoUpdater.checkForUpdates()
}
