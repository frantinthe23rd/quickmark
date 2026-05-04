import { Editor } from '@tiptap/react'
import { EditorMode, ThemeOverride } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import './Toolbar.css'

interface ToolbarProps {
  editor: Editor | null
  mode: EditorMode
  onModeToggle: () => void
}

interface FormatAction {
  label: string
  title: string
  action: (e: Editor) => void
  isActive?: (e: Editor) => boolean
}

const FORMAT: FormatAction[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', action: e => e.chain().focus().toggleBold().run(), isActive: e => e.isActive('bold') },
  { label: 'I', title: 'Italic (Ctrl+I)', action: e => e.chain().focus().toggleItalic().run(), isActive: e => e.isActive('italic') },
  { label: 'S', title: 'Strikethrough', action: e => e.chain().focus().toggleStrike().run(), isActive: e => e.isActive('strike') }
]

const HEADINGS: FormatAction[] = ([1, 2, 3] as const).map(level => ({
  label: `H${level}`,
  title: `Heading ${level}`,
  action: e => e.chain().focus().toggleHeading({ level }).run(),
  isActive: e => e.isActive('heading', { level })
}))

const BLOCKS: FormatAction[] = [
  { label: '≡', title: 'Bullet list', action: e => e.chain().focus().toggleBulletList().run(), isActive: e => e.isActive('bulletList') },
  { label: '1≡', title: 'Ordered list', action: e => e.chain().focus().toggleOrderedList().run(), isActive: e => e.isActive('orderedList') },
  { label: '"', title: 'Blockquote', action: e => e.chain().focus().toggleBlockquote().run(), isActive: e => e.isActive('blockquote') }
]

const INSERTS: FormatAction[] = [
  { label: '</>', title: 'Code block', action: e => e.chain().focus().toggleCodeBlock().run(), isActive: e => e.isActive('codeBlock') },
  { label: '━', title: 'Horizontal rule', action: e => e.chain().focus().setHorizontalRule().run() }
]

const THEME_CYCLE: Record<ThemeOverride, ThemeOverride> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON: Record<ThemeOverride, string> = { system: '⊙', light: '☾', dark: '☀' }

function Btn({ label, title, active, disabled, onClick }: {
  label: string; title: string; active?: boolean; disabled?: boolean; onClick: () => void
}): JSX.Element {
  return (
    <button
      className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >{label}</button>
  )
}

function Divider(): JSX.Element {
  return <div className="toolbar__divider" />
}

export function Toolbar({ editor, mode, onModeToggle }: ToolbarProps): JSX.Element {
  const { override, setOverride } = useTheme()
  const wysiwyg = mode === 'wysiwyg'
  const disabled = !editor || !wysiwyg

  const btns = (actions: FormatAction[]): JSX.Element[] =>
    actions.map(({ label, title, action, isActive }) => (
      <Btn
        key={label}
        label={label}
        title={title}
        active={!disabled && !!isActive?.(editor!)}
        disabled={disabled}
        onClick={() => editor && action(editor)}
      />
    ))

  return (
    <div className="toolbar">
      {btns(FORMAT)}
      <Divider />
      {btns(HEADINGS)}
      <Divider />
      {btns(BLOCKS)}
      <Divider />
      {btns(INSERTS)}
      <div className="toolbar__spacer" />
      <Btn label={THEME_ICON[override]} title={`Theme: ${override} (click to cycle)`} onClick={() => setOverride(THEME_CYCLE[override])} />
      <Btn
        label={wysiwyg ? '⌨ Source' : '◉ WYSIWYG'}
        title="Toggle source view (Ctrl+Shift+S)"
        active={!wysiwyg}
        onClick={onModeToggle}
      />
    </div>
  )
}
