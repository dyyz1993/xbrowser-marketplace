import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockMineGet = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      plugins: {
        mine: { $get: mockMineGet },
        ':slug': { $delete: mockDelete },
      },
    },
  },
}))

const mockAuthStore = {
  isAuthenticated: true,
  token: 'test-token',
  user: { id: 'user-1', username: 'testuser', email: 'test@test.com', role: 'developer' },
}

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (state: typeof mockAuthStore) => unknown) => {
    if (selector) return selector(mockAuthStore)
    return mockAuthStore
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

describe('DeveloperDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMineGet.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: '1',
              name: 'My Plugin',
              slug: 'my-plugin',
              status: 'approved',
              version: '1.0.0',
              downloadCount: 10,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }),
    })
  })

  it('renders dashboard page when authenticated', async () => {
    const { DeveloperDashboardPage } = await import('../DeveloperDashboardPage')
    render(<DeveloperDashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('developer-dashboard-page')).toBeInTheDocument()
    })
  })

  it('fetches user plugins on mount', async () => {
    const { DeveloperDashboardPage } = await import('../DeveloperDashboardPage')
    render(<DeveloperDashboardPage />)

    await waitFor(() => {
      expect(mockMineGet).toHaveBeenCalled()
    })
  })

  it('shows auth required when not authenticated', async () => {
    mockAuthStore.isAuthenticated = false
    const { DeveloperDashboardPage } = await import('../DeveloperDashboardPage')
    render(<DeveloperDashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('developer-dashboard-auth-required')).toBeInTheDocument()
    })

    mockAuthStore.isAuthenticated = true
  })

  it('shows error when fetch fails', async () => {
    mockMineGet.mockRejectedValue(new Error('Network error'))

    const { DeveloperDashboardPage } = await import('../DeveloperDashboardPage')
    render(<DeveloperDashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('developer-dashboard-error')).toBeInTheDocument()
    })
  })
})
