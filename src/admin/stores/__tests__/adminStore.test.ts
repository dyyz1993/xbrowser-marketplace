import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, Permission } from '@shared/modules/permission'
import type { AuthUserResponse, SystemStats, LoginResponse } from '@shared/modules/admin'

interface AdminState {
  user: AuthUserResponse | null
  token: string | null
  isAuthenticated: boolean
  stats: SystemStats | null
  loading: boolean
  login: (username: string, password: string) => Promise<LoginResponse>
  logout: () => void
  fetchStats: () => Promise<void>
  setUser: (user: AuthUserResponse) => void
  setToken: (token: string) => void
}

const localStorageStore: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = String(value)
  },
  removeItem: (key: string) => {
    delete localStorageStore[key]
  },
  clear: () => {
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
  },
  get length() {
    return Object.keys(localStorageStore).length
  },
  key: (_i: number) => null,
}

vi.stubGlobal('localStorage', localStorageMock)

const mockLoginResponse = {
  success: true,
  data: {
    user: {
      id: '1',
      username: 'admin',
      email: 'admin@test.com',
      role: Role.SUPER_ADMIN,
      avatar: null,
      permissions: [Permission.USER_VIEW],
    },
    token: 'test-token',
  },
}

const mockStatsResponse = {
  success: true,
  data: {
    totalTodos: 10,
    pendingTodos: 3,
    completedTodos: 7,
    lastUpdated: '2024-01-01',
  },
}

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        login: {
          $post: vi.fn(async () => ({
            json: async () => mockLoginResponse,
          })),
        },
        stats: {
          $get: vi.fn(async () => ({
            json: async () => mockStatsResponse,
          })),
        },
      },
    },
  },
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissionStore: {
    getState: () => ({
      initPermissions: vi.fn(),
      reset: vi.fn(),
    }),
  },
}))

describe('useAdminStore', () => {
  let useAdminStore: { getState: () => AdminState; setState: (s: Partial<AdminState>) => void }

  beforeEach(async () => {
    const mod = await import('../adminStore')
    useAdminStore = mod.useAdminStore
    localStorageMock.clear()
    useAdminStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      stats: null,
      loading: false,
    })
    vi.clearAllMocks()
  })

  it('should have correct initial state', () => {
    const state = useAdminStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.stats).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('should set user and token on login', async () => {
    const result = await useAdminStore.getState().login('admin', 'password')

    const state = useAdminStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockLoginResponse.data.user)
    expect(state.token).toBe('test-token')
    expect(state.loading).toBe(false)
    expect(result).toEqual(mockLoginResponse.data)
  })

  it('should clear state on logout', async () => {
    await useAdminStore.getState().login('admin', 'password')
    expect(useAdminStore.getState().isAuthenticated).toBe(true)

    useAdminStore.getState().logout()

    const state = useAdminStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.stats).toBeNull()
  })

  it('should populate stats on fetchStats', async () => {
    await useAdminStore.getState().fetchStats()

    const state = useAdminStore.getState()
    expect(state.stats).toEqual(mockStatsResponse.data)
  })

  it('should set user via setUser', () => {
    const user = {
      id: '2',
      username: 'testuser',
      email: 'test@test.com',
      role: Role.USER,
      avatar: null,
      permissions: [Permission.USER_VIEW],
    }
    useAdminStore.getState().setUser(user)
    expect(useAdminStore.getState().user).toEqual(user)
  })

  it('should set token via setToken', () => {
    useAdminStore.getState().setToken('new-token')
    expect(useAdminStore.getState().token).toBe('new-token')
  })

  it('should handle login failure', async () => {
    const { apiClient } = await import('../../services/apiClient')
    vi.mocked(apiClient.api.admin.login.$post).mockImplementationOnce(
      async () =>
        ({
          json: async () => ({
            success: false,
            error: 'Invalid credentials',
          }),
        }) as never
    )

    await expect(useAdminStore.getState().login('wrong', 'creds')).rejects.toThrow(
      'Invalid credentials'
    )
    expect(useAdminStore.getState().loading).toBe(false)
    expect(useAdminStore.getState().isAuthenticated).toBe(false)
  })
})
