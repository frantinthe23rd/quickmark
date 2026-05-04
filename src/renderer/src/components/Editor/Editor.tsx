import { Editor as TipTapEditor } from '@tiptap/react'
import { WysiwygEditor } from './WysiwygEditor'
import { SourceEditor } from './SourceEditor'
import { EditorMode } from '../../types'
import { useTheme } from '../../context/ThemeContext'
import './Editor.css'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  mode: EditorMode
  editorRef?: (editor: TipTapEditor | null) => void
}

export function Editor({ content, onChange, mode, editorRef }: EditorProps): JSX.Element {
  const { isDark } = useTheme()

  return (
    <div className="editor-container">
      {mode === 'wysiwyg' ? (
        <WysiwygEditor content={content} onChange={onChange} editorRef={editorRef} />
      ) : (
        <SourceEditor content={content} onChange={onChange} isDark={isDark} />
      )}
    </div>
  )
}
