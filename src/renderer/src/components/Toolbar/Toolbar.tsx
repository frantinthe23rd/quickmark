import React, { ReactNode, useEffect, useState } from 'react'
import { Editor } from '@tiptap/react'
import { EditorMode, ThemeOverride } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import {
  IconBold, IconItalic, IconStrike,
  IconH1, IconH2, IconH3,
  IconBullet, IconOrdered, IconQuote, IconIndent, IconOutdent,
  IconCodeBlock, IconRule, IconLink,
  IconSystem, IconMoon, IconSun,
  IconSource, IconWysiwyg
} from './icons'
import './Toolbar.css'

interface ToolbarProps {
  editor: Editor | null
  mode: EditorMode
  onModeToggle: () => void
}

interface FormatAction {
  icon: ReactNode
  title: string
  action: (e: Editor) => void
  isActive?: (e: Editor) => boolean
}

const FORMAT: FormatAction[] = [
  { icon: <IconBold />, title: 'Bold (Ctrl+B)', action: e => e.chain().focus().toggleBold().run(), isActive: e => e.isActive('bold') },
  { icon: <IconItalic />, title: 'Italic (Ctrl+I)', action: e => e.chain().focus().toggleItalic().run(), isActive: e => e.isActive('italic') },
  { icon: <IconStrike />, title: 'Strikethrough', action: e => e.chain().focus().toggleStrike().run(), isActive: e => e.isActive('strike') }
]

const HEADINGS: FormatAction[] = ([1, 2, 3] as const).map((level, i) => ({
  icon: [<IconH1 />, <IconH2 />, <IconH3 />][i],
  title: `Heading ${level}`,
  action: e => e.chain().focus().toggleHeading({ level }).run(),
  isActive: e => e.isActive('heading', { level })
}))

const BLOCKS: FormatAction[] = [
  { icon: <IconBullet />, title: 'Bullet list', action: e => e.chain().focus().toggleBulletList().run(), isActive: e => e.isActive('bulletList') },
  { icon: <IconOrdered />, title: 'Ordered list', action: e => e.chain().focus().toggleOrderedList().run(), isActive: e => e.isActive('orderedList') },
  { icon: <IconQuote />, title: 'Blockquote', action: e => e.chain().focus().toggleBlockquote().run(), isActive: e => e.isActive('blockquote') },
  { icon: <IconIndent />, title: 'Indent list item (Tab)', action: e => e.chain().focus().sinkListItem('listItem').run() },
  { icon: <IconOutdent />, title: 'Outdent list item (Shift+Tab)', action: e => e.chain().focus().liftListItem('listItem').run() }
]

const INSERTS: FormatAction[] = [
  { icon: <IconLink />, title: 'Link (Ctrl+K)', action: e => {
    const prev = e.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') { e.chain().focus().unsetLink().run(); return }
    e.chain().focus().setLink({ href: url }).run()
  }, isActive: e => e.isActive('link') },
  { icon: <IconCodeBlock />, title: 'Code block', action: e => e.chain().focus().toggleCodeBlock().run(), isActive: e => e.isActive('codeBlock') },
  { icon: <IconRule />, title: 'Horizontal rule', action: e => e.chain().focus().setHorizontalRule().run() }
]

const THEME_CYCLE: Record<ThemeOverride, ThemeOverride> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICONS: Record<ThemeOverride, ReactNode> = {
  system: <IconSystem />,
  light: <IconMoon />,
  dark: <IconSun />
}
const THEME_TITLES: Record<ThemeOverride, string> = {
  system: 'Theme: system (click for light)',
  light: 'Theme: light (click for dark)',
  dark: 'Theme: dark (click for system)'
}

function Btn({ children, title, active, disabled, onClick }: {
  children: ReactNode; title: string; active?: boolean; disabled?: boolean; onClick: () => void
}): React.JSX.Element {
  return (
    <button
      className={`toolbar__btn ${active ? 'toolbar__btn--active' : ''}`}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >{children}</button>
  )
}

function Divider(): React.JSX.Element {
  return <div className="toolbar__divider" />
}

export function Toolbar({ editor, mode, onModeToggle }: ToolbarProps): React.JSX.Element {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    const sync = (): void => setTick(t => t + 1)
    editor.on('transaction', sync)
    return () => { editor.off('transaction', sync) }
  }, [editor])
  const { override, setOverride } = useTheme()
  const wysiwyg = mode === 'wysiwyg'
  const disabled = !editor || !wysiwyg

  const btns = (actions: FormatAction[]): React.JSX.Element[] =>
    actions.map(({ icon, title, action, isActive }, i) => (
      <Btn
        key={i}
        title={title}
        active={!disabled && !!isActive?.(editor!)}
        disabled={disabled}
        onClick={() => editor && action(editor)}
      >{icon}</Btn>
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
      <Btn title={THEME_TITLES[override]} onClick={() => setOverride(THEME_CYCLE[override])}>
        {THEME_ICONS[override]}
      </Btn>
      <Btn
        title="Toggle source view (Ctrl+Shift+S)"
        active={!wysiwyg}
        onClick={onModeToggle}
      >
        <span className="toolbar__mode-btn">
          {wysiwyg ? <><IconSource /> Source</> : <><IconWysiwyg /> WYSIWYG</>}
        </span>
      </Btn>
    </div>
  )
}
