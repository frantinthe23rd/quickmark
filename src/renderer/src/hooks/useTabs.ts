import { useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { Tab } from '../types'

function getTitle(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  return filePath.replace(/\\/g, '/').split('/').pop() || 'Untitled'
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
      if (!prev.some(t => t.id === id)) return prev
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
