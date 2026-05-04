import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabs } from './useTabs'

describe('useTabs', () => {
  it('starts with one untitled tab', () => {
    const { result } = renderHook(() => useTabs())
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBeNull()
    expect(result.current.tabs[0].title).toBe('Untitled')
    expect(result.current.tabs[0].isDirty).toBe(false)
  })

  it('openTab adds a tab and activates it', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '# Hello' }))
    expect(result.current.tabs).toHaveLength(2)
    expect(result.current.tabs[1].filePath).toBe('/foo/bar.md')
    expect(result.current.tabs[1].title).toBe('bar.md')
    expect(result.current.activeTabId).toBe(result.current.tabs[1].id)
  })

  it('openTab does not duplicate tabs for the same path', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '' }))
    act(() => result.current.openTab({ path: '/foo/bar.md', content: '' }))
    expect(result.current.tabs).toHaveLength(2)
  })

  it('updateContent marks tab dirty', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.updateContent(id, 'new content'))
    expect(result.current.tabs[0].isDirty).toBe(true)
    expect(result.current.tabs[0].content).toBe('new content')
  })

  it('markSaved clears dirty and updates filePath and title', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.updateContent(id, 'x'))
    act(() => result.current.markSaved(id, '/new/path.md'))
    expect(result.current.tabs[0].isDirty).toBe(false)
    expect(result.current.tabs[0].filePath).toBe('/new/path.md')
    expect(result.current.tabs[0].title).toBe('path.md')
  })

  it('closeTab removes tab and activates adjacent tab', () => {
    const { result } = renderHook(() => useTabs())
    act(() => result.current.openTab({ path: '/a.md', content: '' }))
    const firstId = result.current.tabs[0].id
    act(() => result.current.closeTab(firstId))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBe('/a.md')
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
  })

  it('closing the last tab replaces it with a fresh untitled tab', () => {
    const { result } = renderHook(() => useTabs())
    const id = result.current.tabs[0].id
    act(() => result.current.closeTab(id))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].filePath).toBeNull()
    expect(result.current.tabs[0].id).not.toBe(id)
  })
})
