import { useEffect } from 'react'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'

interface WysiwygEditorProps {
  content: string
  onChange: (markdown: string) => void
  editorRef?: (editor: Editor | null) => void
}

export function WysiwygEditor({ content, onChange, editorRef }: WysiwygEditorProps): JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
  }, [content]) // only re-sync when content changes externally (tab switch)

  return (
    <div className="wysiwyg-editor">
      <EditorContent editor={editor} />
    </div>
  )
}
