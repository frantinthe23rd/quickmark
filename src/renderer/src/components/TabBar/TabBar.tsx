import { Tab } from '../../types'
import './TabBar.css'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: TabBarProps): JSX.Element {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          tabIndex={0}
          aria-selected={tab.id === activeTabId}
          className={`tab ${tab.id === activeTabId ? 'tab--active' : ''}`}
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tab.id) } }}
          title={tab.filePath ?? 'Untitled'}
        >
          {tab.isDirty && <span className="tab__dirty" aria-label="unsaved" />}
          <span className="tab__title">{tab.title}</span>
          <button
            className="tab__close"
            onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
            aria-label={`Close ${tab.title}`}
          >
            ×
          </button>
        </div>
      ))}
      <button className="tab-bar__new" onClick={onNew} aria-label="New file" title="New file (Ctrl+N)">
        +
      </button>
    </div>
  )
}
