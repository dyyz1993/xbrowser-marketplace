import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@client/services/apiClient'

// eslint-disable-next-line local-rules/prefer-shared-types
interface UserProfile {
  id: string
  username: string
  email: string
  role: string
}

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  user: UserProfile | null
  loading: boolean

  setToken: (token: string) => void
  setUser: (user: UserProfile) => void
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  verify: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      user: null,
      loading: false,

      setToken: (token: string) =>
        set({
          token,
          isAuthenticated: true,
        }),

      setUser: (user: UserProfile) => set({ user }),

      login: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const res = await apiClient.api.auth.login.$post({ json: { email, password } })
          const result = await res.json()
          if (result.success) {
            set({
              token: result.data.token,
              isAuthenticated: true,
              user: result.data.profile,
              loading: false,
            })
          } else {
            set({ loading: false })
            throw new Error('Login failed')
          }
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ loading: true })
        try {
          const res = await apiClient.api.auth.register.$post({
            json: { username, email, password },
          })
          const result = await res.json()
          if (!result.success) {
            set({ loading: false })
            throw new Error('Registration failed')
          }

          const loginRes = await apiClient.api.auth.login.$post({ json: { email, password } })
          const loginResult = await loginRes.json()
          if (loginResult.success) {
            set({
              token: loginResult.data.token,
              isAuthenticated: true,
              user: loginResult.data.profile,
              loading: false,
            })
          } else {
            set({ loading: false })
          }
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      verify: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await apiClient.api.auth.verify.$get()
          const result = await res.json()
          if (result.success) {
            set({ user: result.data })
          }
        } catch {
          get().logout()
        }
      },

      logout: () =>
        set({
          token: null,
          isAuthenticated: false,
          user: null,
        }),
    }),
    {
      name: 'auth-token',
    }
  )
)
