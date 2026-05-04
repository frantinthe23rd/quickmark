import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFile } from './useFile'

const mockApi = {
  openFile: vi.fn(),
  openFilePath: vi.fn(),
  saveFile: vi.fn(),
  saveFileAs: vi.fn(),
  getRecentFiles: vi.fn(),
  exportPdf: vi.fn(),
  exportHtml: vi.fn(),
  getTheme: vi.fn(),
  setTheme: vi.fn(),
  onMenuAction: vi.fn(() => () => {}),
  onThemeChange: vi.fn(() => () => {})
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

describe('useFile auto-save', () => {
  const openTab = vi.fn()
  const markSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockApi.saveFile.mockResolvedValue(undefined)
  })

  afterEach(() => vi.useRealTimers())

  it('saves after 2 seconds of inactivity', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave('/path/file.md', 'hello', 'tab-1'))
    expect(mockApi.saveFile).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(mockApi.saveFile).toHaveBeenCalledWith('/path/file.md', 'hello')
    expect(markSaved).toHaveBeenCalledWith('tab-1', '/path/file.md')
  })

  it('skips save when filePath is null', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave(null, 'hello', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(mockApi.saveFile).not.toHaveBeenCalled()
  })

  it('resets the debounce timer on rapid calls', async () => {
    const { result } = renderHook(() => useFile({ openTab, markSaved }))
    act(() => result.current.scheduleAutoSave('/file.md', 'v1', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(1500) })
    act(() => result.current.scheduleAutoSave('/file.md', 'v2', 'tab-1'))
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(mockApi.saveFile).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(500) })
    expect(mockApi.saveFile).toHaveBeenCalledTimes(1)
    expect(mockApi.saveFile).toHaveBeenCalledWith('/file.md', 'v2')
  })
})
