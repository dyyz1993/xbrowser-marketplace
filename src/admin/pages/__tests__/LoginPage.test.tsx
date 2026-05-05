import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '../LoginPage'

const mockNavigate = vi.fn()
const mockLogin = vi.fn()
let mockLoading = false

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../../stores/adminStore', () => ({
  useAdminStore: () => ({
    login: mockLogin,
    loading: mockLoading,
  }),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoading = false
  })

  it('renders login form with username and password inputs', () => {
    render(<LoginPage />)

    expect(screen.getByTestId('admin-login-form')).toBeInTheDocument()
    expect(screen.getByTestId('admin-login-username')).toBeInTheDocument()
    expect(screen.getByTestId('admin-login-password')).toBeInTheDocument()
    expect(screen.getByTestId('admin-login-submit')).toBeInTheDocument()
  })

  it('shows validation error for empty fields on submit', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByTestId('admin-login-submit'))

    await waitFor(() => {
      expect(screen.getByText('请输入用户名！')).toBeInTheDocument()
    })
  })

  it('calls login and navigates to dashboard on success', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({ token: 'test-token' })

    render(<LoginPage />)

    await user.type(screen.getByTestId('admin-login-username'), 'admin')
    await user.type(screen.getByTestId('admin-login-password'), 'password123')
    await user.click(screen.getByTestId('admin-login-submit'))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message on login failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))

    render(<LoginPage />)

    await user.type(screen.getByTestId('admin-login-username'), 'admin')
    await user.type(screen.getByTestId('admin-login-password'), 'wrong')
    await user.click(screen.getByTestId('admin-login-submit'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled()
    })
  })

  it('quick login buttons call login with correct credentials', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({ token: 'test-token' })

    render(<LoginPage />)

    const quickLoginButton = screen.getByText('超级管理员')
    await user.click(quickLoginButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('superadmin', '123456')
    })
  })

  it('shows loading spinner during submission', () => {
    mockLoading = true

    render(<LoginPage />)

    expect(screen.getByTestId('admin-login-submit')).toHaveClass('ant-btn-loading')
  })
})
