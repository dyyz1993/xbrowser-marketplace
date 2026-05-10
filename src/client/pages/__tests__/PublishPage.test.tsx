import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPost = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      plugins: {
        publish: {
          $post: mockPost,
        },
      },
    },
  },
}))

const mockAuthStore = {
  isAuthenticated: true,
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

describe('PublishPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { id: '1', slug: 'test-plugin' } }),
    })
  })

  it('renders publish page', async () => {
    const { PublishPage } = await import('../PublishPage')
    render(<PublishPage />)

    await waitFor(() => {
      expect(screen.getByTestId('publish-page')).toBeInTheDocument()
    })
  })

  it('renders publish form with fields', async () => {
    const { PublishPage } = await import('../PublishPage')
    render(<PublishPage />)

    await waitFor(() => {
      expect(screen.getByTestId('publish-form')).toBeInTheDocument()
    })

    expect(screen.getByTestId('plugin-name-input')).toBeInTheDocument()
    expect(screen.getByTestId('plugin-slug-input')).toBeInTheDocument()
    expect(screen.getByTestId('plugin-version-input')).toBeInTheDocument()
    expect(screen.getByTestId('plugin-description-input')).toBeInTheDocument()
    expect(screen.getByTestId('publish-submit-button')).toBeInTheDocument()
  })

  it('shows success message after publish', async () => {
    const user = userEvent.setup()
    const { PublishPage } = await import('../PublishPage')
    render(<PublishPage />)

    await waitFor(() => {
      expect(screen.getByTestId('plugin-name-input')).toBeInTheDocument()
    })

    await user.type(screen.getByTestId('plugin-name-input'), 'Test Plugin')
    await user.type(screen.getByTestId('plugin-slug-input'), 'test-plugin')
    await user.type(screen.getByTestId('plugin-version-input'), '1.0.0')
    await user.type(screen.getByTestId('plugin-description-input'), 'A test plugin')

    await user.click(screen.getByTestId('publish-submit-button'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
    })
  })

  it('shows error when not authenticated', async () => {
    mockAuthStore.isAuthenticated = false
    const { PublishPage } = await import('../PublishPage')
    render(<PublishPage />)

    mockAuthStore.isAuthenticated = true

    await waitFor(() => {
      expect(screen.getByText(/login/i) || screen.getByText(/sign/i)).toBeTruthy()
    })
  })
})
