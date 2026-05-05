import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute'
import { Role } from '@shared/modules/permission'

const mockInitPermissions = vi.fn()
const mockFetchStaticData = vi.fn()

const mockAdminState = {
  isAuthenticated: false as boolean,
  user: null as { id: string; role: string } | null,
}

const mockPermState = {
  initialized: false as boolean,
  initPermissions: mockInitPermissions,
  fetchStaticData: mockFetchStaticData,
}

vi.mock('../../stores/adminStore', () => ({
  useAdminStore: () => mockAdminState,
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissionStore: () => mockPermState,
}))

function renderWithRouter(ui: React.ReactElement, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAdminState.isAuthenticated = false
    mockAdminState.user = null
    mockPermState.initialized = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('should redirect to /login when not authenticated', () => {
    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('should render children when authenticated', () => {
    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('should redirect to /dashboard when user lacks required role', () => {
    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: '1', role: Role.USER }

    renderWithRouter(
      <ProtectedRoute requiredRole={Role.SUPER_ADMIN}>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('should allow access for super admin regardless of required role', () => {
    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute requiredRole={Role.CUSTOMER_SERVICE}>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })

  it('should init permissions when authenticated and not initialized', () => {
    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: '1', role: Role.SUPER_ADMIN }

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockInitPermissions).toHaveBeenCalled()
    expect(mockFetchStaticData).toHaveBeenCalled()
  })

  it('should not init permissions when already initialized', () => {
    mockAdminState.isAuthenticated = true
    mockAdminState.user = { id: '1', role: Role.SUPER_ADMIN }
    mockPermState.initialized = true

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected">Protected Content</div>
      </ProtectedRoute>
    )

    expect(mockInitPermissions).not.toHaveBeenCalled()
  })
})
