import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'

interface SourceEditorProps {
  content: string
  onChange: (markdown: string) => void
  isDark: boolean
}

export function SourceEditor({ content, onChange, isDark }: SourceEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          markdown(),
          ...(isDark ? [oneDark] : []),
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChange(update.state.doc.toString())
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '14px' },
            '.cm-scroller': { fontFamily: 'ui-monospace, monospace', overflow: 'auto' }
          })
        ]
      }),
      parent: containerRef.current
    })

    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [isDark]) // recreate on theme change; content synced separately

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: content } })
    }
  }, [content])

  return <div ref={containerRef} className="source-editor" style={{ height: '100%' }} />
}
