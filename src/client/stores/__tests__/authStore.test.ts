import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('zustand/middleware', async importOriginal => {
  const actual = await importOriginal<typeof import('zustand/middleware')>()
  return {
    ...actual,
    persist: (fn: unknown, _opts: unknown) => fn,
  }
})

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      auth: {
        login: { $post: vi.fn() },
        register: { $post: vi.fn() },
        verify: { $get: vi.fn() },
      },
    },
  },
}))

const { apiClient } = await import('@client/services/apiClient')

import { useAuthStore } from '../authStore'

const mockProfile = { id: 'u1', username: 'testuser', email: 'test@test.com', role: 'user' }

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
      user: null,
      loading: false,
    })
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('should set token and mark authenticated', () => {
    useAuthStore.getState().setToken('test-jwt-token')
    const state = useAuthStore.getState()
    expect(state.token).toBe('test-jwt-token')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should set user profile', () => {
    useAuthStore.getState().setUser(mockProfile)
    expect(useAuthStore.getState().user).toEqual(mockProfile)
  })

  it('should clear state on logout', () => {
    useAuthStore.getState().setToken('test-jwt-token')
    useAuthStore.getState().setUser(mockProfile)
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
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

  it('should login successfully', async () => {
    vi.mocked(apiClient.api.auth.login.$post).mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: { token: 'jwt-123', profile: mockProfile },
        }),
    } as any)

    await useAuthStore.getState().login('test@test.com', 'password123')

    const state = useAuthStore.getState()
    expect(state.token).toBe('jwt-123')
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockProfile)
    expect(state.loading).toBe(false)
  })

  it('should throw on login failure (success=false)', async () => {
    vi.mocked(apiClient.api.auth.login.$post).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as any)

    await expect(
      useAuthStore.getState().login('test@test.com', 'wrong')
    ).rejects.toThrow('Login failed')

    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('should handle network error on login', async () => {
    vi.mocked(apiClient.api.auth.login.$post).mockRejectedValue(new Error('Network error'))

    await expect(
      useAuthStore.getState().login('test@test.com', 'password')
    ).rejects.toThrow('Network error')

    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('should register and auto-login successfully', async () => {
    vi.mocked(apiClient.api.auth.register.$post).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    } as any)

    vi.mocked(apiClient.api.auth.login.$post).mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: { token: 'jwt-reg', profile: mockProfile },
        }),
    } as any)

    await useAuthStore.getState().register('testuser', 'test@test.com', 'password123')

    const state = useAuthStore.getState()
    expect(state.token).toBe('jwt-reg')
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockProfile)
    expect(state.loading).toBe(false)
  })

  it('should throw on register failure (success=false)', async () => {
    vi.mocked(apiClient.api.auth.register.$post).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as any)

    await expect(
      useAuthStore.getState().register('testuser', 'test@test.com', 'password123')
    ).rejects.toThrow('Registration failed')

    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('should handle register with auto-login failure (success=false)', async () => {
    vi.mocked(apiClient.api.auth.register.$post).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    } as any)

    vi.mocked(apiClient.api.auth.login.$post).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as any)

    await useAuthStore.getState().register('testuser', 'test@test.com', 'password123')

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.loading).toBe(false)
  })

  it('should handle network error on register', async () => {
    vi.mocked(apiClient.api.auth.register.$post).mockRejectedValue(new Error('Server down'))

    await expect(
      useAuthStore.getState().register('testuser', 'test@test.com', 'password')
    ).rejects.toThrow('Server down')

    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('should verify token and set user', async () => {
    useAuthStore.setState({ token: 'jwt-123' })

    vi.mocked(apiClient.api.auth.verify.$get).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockProfile }),
    } as any)

    await useAuthStore.getState().verify()

    expect(useAuthStore.getState().user).toEqual(mockProfile)
  })

  it('should skip verify when no token', async () => {
    useAuthStore.setState({ token: null })

    await useAuthStore.getState().verify()

    expect(apiClient.api.auth.verify.$get).not.toHaveBeenCalled()
  })

  it('should logout on verify failure', async () => {
    useAuthStore.setState({ token: 'jwt-bad', isAuthenticated: true })

    vi.mocked(apiClient.api.auth.verify.$get).mockRejectedValue(new Error('Token expired'))

    await useAuthStore.getState().verify()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('should handle verify with success=false without crashing', async () => {
    useAuthStore.setState({ token: 'jwt-123' })

    vi.mocked(apiClient.api.auth.verify.$get).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    } as any)

    await useAuthStore.getState().verify()

    expect(useAuthStore.getState().user).toBeNull()
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
