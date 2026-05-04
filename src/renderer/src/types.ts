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
