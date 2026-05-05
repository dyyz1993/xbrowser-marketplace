import { describe, it, expect, beforeEach } from 'vitest'
import { useLoadingStore } from '../loadingStore'

describe('useLoadingStore', () => {
  beforeEach(() => {
    useLoadingStore.setState({ count: 0, isLoading: false, loadingText: undefined })
  })

  it('should have correct initial state', () => {
    const state = useLoadingStore.getState()
    expect(state.count).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.loadingText).toBeUndefined()
  })

  it('should increment count and set isLoading on startLoading', () => {
    useLoadingStore.getState().startLoading('Loading...')
    const state = useLoadingStore.getState()
    expect(state.count).toBe(1)
    expect(state.isLoading).toBe(true)
    expect(state.loadingText).toBe('Loading...')
  })

  it('should increment count multiple times', () => {
    useLoadingStore.getState().startLoading('First')
    useLoadingStore.getState().startLoading('Second')
    const state = useLoadingStore.getState()
    expect(state.count).toBe(2)
    expect(state.isLoading).toBe(true)
  })

  it('should decrement count on stopLoading', () => {
    useLoadingStore.getState().startLoading()
    useLoadingStore.getState().stopLoading()
    const state = useLoadingStore.getState()
    expect(state.count).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.loadingText).toBeUndefined()
  })

  it('should only set isLoading false when count reaches 0', () => {
    useLoadingStore.getState().startLoading('A')
    useLoadingStore.getState().startLoading('B')
    useLoadingStore.getState().stopLoading()

    const state = useLoadingStore.getState()
    expect(state.count).toBe(1)
    expect(state.isLoading).toBe(true)

    useLoadingStore.getState().stopLoading()
    const state2 = useLoadingStore.getState()
    expect(state2.count).toBe(0)
    expect(state2.isLoading).toBe(false)
  })

  it('should not decrement count below 0', () => {
    useLoadingStore.getState().stopLoading()
    const state = useLoadingStore.getState()
    expect(state.count).toBe(0)
    expect(state.isLoading).toBe(false)
  })

  it('should accept startLoading without text', () => {
    useLoadingStore.getState().startLoading()
    const state = useLoadingStore.getState()
    expect(state.loadingText).toBeUndefined()
  })
})
