import React, { useState, useEffect } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })

interface MermaidDiagramProps {
  code: string
}

export function MermaidDiagram({ code }: MermaidDiagramProps): React.JSX.Element {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setSvg(null)
    setError(null)

    const renderId = `mermaid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    mermaid.render(renderId, code)
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })

    return () => { cancelled = true }
  }, [code])

  if (error !== null) return <div className="mermaid-error">{error}</div>
  if (svg === null) return <div className="mermaid-loading">Rendering…</div>
  return <div dangerouslySetInnerHTML={{ __html: svg }} />
}

export function CodeBlockView({ node }: NodeViewProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const language = node.attrs.language as string | null
  const isMermaid = language === 'mermaid'

  if (isMermaid && !isEditing) {
    return (
      <NodeViewWrapper>
        <div className="mermaid-block">
          <MermaidDiagram code={node.textContent} />
          <button className="mermaid-edit-btn" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}>Edit</button>
        </div>
        {/* NodeViewContent must be rendered for TipTap — hidden visually, not display:none */}
        <div aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' }}>
          <NodeViewContent as="code" />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <pre data-language={language ?? undefined}>
        <NodeViewContent as="code" className={language ? `language-${language}` : undefined} />
      </pre>
      {isMermaid && (
        <button className="mermaid-done-btn" onClick={(e) => { e.stopPropagation(); setIsEditing(false) }}>Done</button>
      )}
    </NodeViewWrapper>
  )
}
