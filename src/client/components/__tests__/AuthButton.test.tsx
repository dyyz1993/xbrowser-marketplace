import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthButton } from '../AuthButton'

const mockSetToken = vi.fn()
const mockLogout = vi.fn()

const baseState = {
  isAuthenticated: false,
  token: null as string | null,
  user: null as { id: string; username: string; email: string; role: string } | null,
  loading: false,
  logout: mockLogout,
  setToken: mockSetToken,
  setUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  verify: vi.fn(),
}

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: unknown) => {
    if (typeof selector === 'function') return selector(baseState)
    return baseState
  }),
}))

import { useAuthStore } from '../../stores/authStore'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() },
    })
  })

  it('should show login and register links when not authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: unknown) => {
      const state = {
        ...baseState,
        isAuthenticated: false,
        token: null,
        user: null,
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    renderWithRouter(<AuthButton />)

    expect(screen.getByTestId('auth-login-link')).toBeInTheDocument()
    expect(screen.getByTestId('auth-register-link')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-logout-btn')).not.toBeInTheDocument()
  })

  it('should show logout button when authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: unknown) => {
      const state = {
        ...baseState,
        isAuthenticated: true,
        token: 'user-token',
        user: { id: '1', username: 'testuser', email: 'test@test.com', role: 'developer' },
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    renderWithRouter(<AuthButton />)

    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByTestId('auth-logout-btn')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-login-link')).not.toBeInTheDocument()
  })

  it('should call logout and reload on logout click', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: unknown) => {
      const state = {
        ...baseState,
        isAuthenticated: true,
        token: 'user-token',
        user: { id: '1', username: 'testuser', email: 'test@test.com', role: 'developer' },
      }
      if (typeof selector === 'function') return selector(state)
      return state
    })

    renderWithRouter(<AuthButton />)

    fireEvent.click(screen.getByTestId('auth-logout-btn'))

    expect(mockLogout).toHaveBeenCalled()
    expect(window.location.reload).toHaveBeenCalled()
  })
})
