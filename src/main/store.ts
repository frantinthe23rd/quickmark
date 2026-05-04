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
