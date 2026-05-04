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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
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
    if (autoSaveEnabled) {
      scheduleAutoSave(activeTab.filePath, content, activeTab.id)
    }
  }, [activeTab, updateContent, scheduleAutoSave, autoSaveEnabled])

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
      else if (action === 'print') window.print()
      else if (action === 'toggleAutoSave') setAutoSaveEnabled(payload === 'true')
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
