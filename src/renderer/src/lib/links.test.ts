import { describe, it, expect } from 'vitest'
import { findUrlAtOffset } from './links'

describe('findUrlAtOffset', () => {
  it('finds a bare URL when offset falls inside it', () => {
    // "Visit " is 6 chars; URL starts at index 6
    expect(findUrlAtOffset('Visit https://example.com today', 10)).toBe('https://example.com')
  })

  it('finds a URL inside a markdown link syntax', () => {
    // "[Click](" is 8 chars; URL starts at index 8
    expect(findUrlAtOffset('[Click](https://example.com)', 10)).toBe('https://example.com')
  })

  it('returns null when offset is before the URL', () => {
    expect(findUrlAtOffset('Visit https://example.com', 2)).toBeNull()
  })

  it('returns null when the line has no URL', () => {
    expect(findUrlAtOffset('Hello world', 3)).toBeNull()
  })

  it('finds a URL when offset is exactly at its start', () => {
    expect(findUrlAtOffset('https://example.com', 0)).toBe('https://example.com')
  })

  it('finds a URL when offset is exactly at its end', () => {
    // URL is 19 chars (indices 0-18), length = 19
    expect(findUrlAtOffset('https://example.com', 19)).toBe('https://example.com')
  })

  it('does not include a trailing closing paren in the URL', () => {
    // The ) closing the markdown link must not be part of the returned URL
    expect(findUrlAtOffset('[a](https://x.com)', 5)).toBe('https://x.com')
  })

  it('finds the correct URL when two URLs appear on the same line', () => {
    expect(findUrlAtOffset('a https://first.com b https://second.com', 25))
      .toBe('https://second.com')
  })

  it('returns null for an empty string', () => {
    expect(findUrlAtOffset('', 0)).toBeNull()
  })

  it('returns null when offset is well past the URL', () => {
    expect(findUrlAtOffset('https://example.com', 99)).toBeNull()
  })

  it('returns URL without trailing period when URL ends a sentence', () => {
    expect(findUrlAtOffset('Visit https://example.com. Done.', 10)).toBe('https://example.com')
  })
})
