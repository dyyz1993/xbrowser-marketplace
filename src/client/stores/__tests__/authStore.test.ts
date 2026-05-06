import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('zustand/middleware', async importOriginal => {
  const actual = await importOriginal<typeof import('zustand/middleware')>()
  return {
    ...actual,
    persist: (fn: unknown, _opts: unknown) => fn,
  }
})

import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, isAuthenticated: false })
  })

  it('should have correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set token and mark authenticated', () => {
    useAuthStore.getState().setToken('test-jwt-token')
    const state = useAuthStore.getState()
    expect(state.token).toBe('test-jwt-token')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear state on logout', () => {
    useAuthStore.getState().setToken('test-jwt-token')
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should replace existing token on setToken', () => {
    useAuthStore.getState().setToken('first-token')
    useAuthStore.getState().setToken('second-token')
    expect(useAuthStore.getState().token).toBe('second-token')
  })

  it('should handle logout when already logged out', () => {
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should transition from authenticated to unauthenticated correctly', () => {
    useAuthStore.getState().setToken('token-a')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    useAuthStore.getState().setToken('token-b')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('should support setState for direct state manipulation', () => {
    useAuthStore.setState({ token: 'direct-token', isAuthenticated: true })
    expect(useAuthStore.getState().token).toBe('direct-token')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
