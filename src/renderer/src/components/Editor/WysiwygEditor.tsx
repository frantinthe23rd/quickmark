import { useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import { Extension } from '@tiptap/core'

const KeyboardOverrides = Extension.create({
  name: 'keyboardOverrides',
  priority: 200,
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => true,
      Tab: () => this.editor.commands.sinkListItem('listItem'),
      'Shift-Tab': () => this.editor.commands.liftListItem('listItem'),
    }
  }
})

interface WysiwygEditorProps {
  content: string
  onChange: (markdown: string) => void
  editorRef?: (editor: Editor | null) => void
}

export function WysiwygEditor({ content, onChange, editorRef }: WysiwygEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      KeyboardOverrides,
      Link.configure({ openOnClick: false }),
      Markdown.configure({ html: false, transformCopiedText: true })
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.storage.markdown.getMarkdown())
    }
  })

  useEffect(() => {
    editorRef?.(editor ?? null)
    return () => editorRef?.(null)
  }, [editor, editorRef])

  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (current !== content) {
      editor.commands.setContent(content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor dep intentionally omitted: adding it fires on init, not just tab switch
  }, [content])

  return (
    <div className="wysiwyg-editor">
      <EditorContent editor={editor} />
    </div>
  )
}
