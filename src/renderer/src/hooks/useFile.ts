import { useRef, useCallback, useEffect } from 'react'
import { Tab } from '../types'

interface UseFileOptions {
  openTab: (file: { path: string; content: string }) => void
  markSaved: (id: string, filePath: string) => void
}

export interface UseFileApi {
  scheduleAutoSave: (filePath: string | null, content: string, tabId: string) => void
  openFile: () => Promise<void>
  openFilePath: (path: string) => Promise<void>
  saveFile: (tab: Tab) => Promise<void>
  saveFileAs: (tab: Tab) => Promise<string | null>
}

export function useFile({ openTab, markSaved }: UseFileOptions): UseFileApi {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const scheduleAutoSave = useCallback(
    (filePath: string | null, content: string, tabId: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (!filePath) return
      timerRef.current = setTimeout(() => {
        window.api.saveFile(filePath, content)
          .then(() => { markSaved(tabId, filePath) })
          .catch((err) => console.error('[useFile] Auto-save failed:', err))
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
