export function wordCount(markdown: string): number {
  const text = stripMarkdown(markdown).trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function charCount(markdown: string): number {
  return stripMarkdown(markdown).length
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`{1,3}([^`\n]+)`{1,3}/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
