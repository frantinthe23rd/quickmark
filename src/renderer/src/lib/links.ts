export function findUrlAtOffset(lineText: string, offset: number): string | null {
  const urlPattern = /https?:\/\/[^\s)>"\]]+/g
  let match: RegExpExecArray | null
  while ((match = urlPattern.exec(lineText)) !== null) {
    if (offset >= match.index && offset <= match.index + match[0].length) {
      return match[0].replace(/[.,!?;:]+$/, '')
    }
  }
  return null
}
