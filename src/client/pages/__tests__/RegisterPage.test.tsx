import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPost = vi.fn()
const mockSetToken = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      auth: {
        register: { $post: mockPost },
      },
    },
  },
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: (state: { setToken: typeof mockSetToken }) => unknown) => {
    if (selector) return selector({ setToken: mockSetToken })
    return { setToken: mockSetToken }
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { token: 'test-token' } }),
    })
  })

  it('renders register page with form', async () => {
    const { RegisterPage } = await import('../RegisterPage')
    render(<RegisterPage />)

    expect(screen.getByTestId('register-page')).toBeInTheDocument()
    expect(screen.getByTestId('register-username')).toBeInTheDocument()
    expect(screen.getByTestId('register-email')).toBeInTheDocument()
    expect(screen.getByTestId('register-password')).toBeInTheDocument()
    expect(screen.getByTestId('register-submit')).toBeInTheDocument()
  })

  it('shows login link', async () => {
    const { RegisterPage } = await import('../RegisterPage')
    render(<RegisterPage />)

    expect(screen.getByTestId('register-login-link')).toBeInTheDocument()
  })

  it('submits register form', async () => {
    const user = userEvent.setup()
    const { RegisterPage } = await import('../RegisterPage')
    render(<RegisterPage />)

    await user.type(screen.getByTestId('register-username'), 'testuser')
    await user.type(screen.getByTestId('register-email'), 'test@test.com')
    await user.type(screen.getByTestId('register-password'), 'password123')
    await user.type(screen.getByTestId('register-confirm-password'), 'password123')
    await user.click(screen.getByTestId('register-submit'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith({
        json: { username: 'testuser', email: 'test@test.com', password: 'password123' },
      })
    })
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    const { RegisterPage } = await import('../RegisterPage')
    render(<RegisterPage />)

    await user.type(screen.getByTestId('register-username'), 'testuser')
    await user.type(screen.getByTestId('register-email'), 'test@test.com')
    await user.type(screen.getByTestId('register-password'), 'password123')
    await user.type(screen.getByTestId('register-confirm-password'), 'different')
    await user.click(screen.getByTestId('register-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('register-error')).toBeInTheDocument()
    })
  })
})
