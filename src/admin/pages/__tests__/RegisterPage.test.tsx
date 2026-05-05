import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterPage } from '../RegisterPage'

const mockNavigate = vi.fn()
const mockPost = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        register: {
          $post: (...args: unknown[]) => mockPost(...args),
        },
      },
    },
  },
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders registration form', () => {
    render(<RegisterPage />)

    expect(screen.getByText('Admin Registration')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please input username!')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'invalid-email')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please input valid email!')).toBeInTheDocument()
    })
  })

  it('validates password minimum length', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), '12345')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters!')).toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'different')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match!')).toBeInTheDocument()
    })
  })

  it('calls register API and navigates to login on success', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled()
      expect(message.success).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('shows error on registration failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Username taken' }),
    })

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled()
    })
  })

  it('shows error on network failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockPost.mockRejectedValueOnce(new Error('Network error'))

    render(<RegisterPage />)

    await user.type(screen.getByPlaceholderText('Username'), 'testuser')
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Password'), 'password123')
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123')

    const submitButton = screen.getByRole('button', { name: /register/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled()
    })
  })
})
