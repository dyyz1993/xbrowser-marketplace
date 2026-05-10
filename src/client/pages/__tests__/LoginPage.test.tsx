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
        login: { $post: mockPost },
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
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { token: 'test-token' } }),
    })
  })

  it('renders login page with form', async () => {
    const { LoginPage } = await import('../LoginPage')
    render(<LoginPage />)

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByTestId('login-email')).toBeInTheDocument()
    expect(screen.getByTestId('login-password')).toBeInTheDocument()
    expect(screen.getByTestId('login-submit')).toBeInTheDocument()
  })

  it('shows register link', async () => {
    const { LoginPage } = await import('../LoginPage')
    render(<LoginPage />)

    expect(screen.getByTestId('login-register-link')).toBeInTheDocument()
  })

  it('submits login form', async () => {
    const user = userEvent.setup()
    const { LoginPage } = await import('../LoginPage')
    render(<LoginPage />)

    await user.type(screen.getByTestId('login-email'), 'test@test.com')
    await user.type(screen.getByTestId('login-password'), 'password123')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith({
        json: { account: 'test@test.com', password: 'password123' },
      })
    })
  })

  it('shows error on failed login', async () => {
    mockPost.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Invalid credentials' }),
    })

    const user = userEvent.setup()
    const { LoginPage } = await import('../LoginPage')
    render(<LoginPage />)

    await user.type(screen.getByTestId('login-email'), 'test@test.com')
    await user.type(screen.getByTestId('login-password'), 'wrong')
    await user.click(screen.getByTestId('login-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeInTheDocument()
    })
  })
})
