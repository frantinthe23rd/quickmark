import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn()
  }
}))

import mermaid from 'mermaid'
import { MermaidDiagram } from './CodeBlockView'

describe('MermaidDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Rendering… while mermaid is loading', () => {
    vi.mocked(mermaid.render).mockReturnValue(new Promise(() => {}))
    const { container } = render(<MermaidDiagram code="graph TD; A-->B" />)
    expect(container.querySelector('.mermaid-loading')?.textContent).toBe('Rendering…')
  })

  it('renders SVG markup when mermaid resolves', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg><circle r="5"/></svg>',
      diagramType: 'flowchart',
      bindFunctions: undefined as never
    })
    const { container } = render(<MermaidDiagram code="graph TD; A-->B" />)
    await waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  it('shows error message when mermaid rejects', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error: unexpected token'))
    const { container } = render(<MermaidDiagram code="invalid ~~~" />)
    await waitFor(() => {
      expect(container.querySelector('.mermaid-error')?.textContent).toBe(
        'Parse error: unexpected token'
      )
    })
  })

  it('shows stringified error when rejection is not an Error instance', async () => {
    vi.mocked(mermaid.render).mockRejectedValue('string error')
    const { container } = render(<MermaidDiagram code="bad" />)
    await waitFor(() => {
      expect(container.querySelector('.mermaid-error')?.textContent).toBe('string error')
    })
  })
})
