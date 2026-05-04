import { useMemo } from 'react'
import { SaveStatus } from '../../types'
import { wordCount, charCount } from '../../lib/markdown'
import './StatusBar.css'

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: '✓ Saved',
  saving: '⟳ Saving…',
  modified: '● Modified',
  unsaved: '● Unsaved'
}

interface StatusBarProps {
  content: string
  saveStatus: SaveStatus
}

export function StatusBar({ content, saveStatus }: StatusBarProps): JSX.Element {
  const words = useMemo(() => wordCount(content), [content])
  const chars = useMemo(() => charCount(content), [content])

  return (
    <div className="status-bar">
      <span className={`status-bar__save status-bar__save--${saveStatus}`}>
        {STATUS_LABEL[saveStatus]}
      </span>
      <span className="status-bar__counts">
        {words} {words === 1 ? 'word' : 'words'} · {chars.toLocaleString()} characters
      </span>
    </div>
  )
}
