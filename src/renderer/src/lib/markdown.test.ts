import { describe, it, expect } from 'vitest'
import { wordCount, charCount } from './markdown'

describe('wordCount', () => {
  it('counts words in plain text', () => {
    expect(wordCount('hello world foo')).toBe(3)
  })

  it('strips markdown headings before counting', () => {
    expect(wordCount('# Heading\n\n**bold** and *italic*')).toBe(4)
  })

  it('returns 0 for empty string', () => {
    expect(wordCount('')).toBe(0)
  })

  it('handles multiple blank lines', () => {
    expect(wordCount('one\n\n\ntwo')).toBe(2)
  })

  it('strips inline code markers but counts the words inside', () => {
    expect(wordCount('a `b` c')).toBe(3)
  })
})

describe('charCount', () => {
  it('strips bold markers before counting', () => {
    expect(charCount('**bold**')).toBe(4)
  })

  it('returns 0 for empty string', () => {
    expect(charCount('')).toBe(0)
  })
})
