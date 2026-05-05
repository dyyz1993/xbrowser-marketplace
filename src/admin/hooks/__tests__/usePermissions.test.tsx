import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import {
  usePermissionStore,
  usePermissions,
  useHasPermission,
  useHasAnyPermission,
  useHasAllPermissions,
  useMenuConfig,
  usePagePermissions,
} from '../usePermissions'
import { Permission, Role } from '@shared/modules/permission'

const mockAdminState = {
  user: { id: 'test-user-1', role: Role.CUSTOMER_SERVICE },
  isAuthenticated: true,
}

vi.mock('../../stores/adminStore', () => ({
  useAdminStore: Object.assign(
    vi.fn(() => mockAdminState),
    {
      getState: () => mockAdminState,
    }
  ),
}))

const mockInitData = {
  success: true,
  data: {
    permissions: [Permission.USER_VIEW, Permission.CONTENT_VIEW, Permission.ORDER_VIEW],
    menuConfig: [
      { path: '/dashboard', label: '仪表盘', icon: 'LayoutDashboard', permissions: [] },
      { path: '/users', label: '用户管理', icon: 'Users', permissions: [Permission.USER_VIEW] },
    ],
    pagePermissions: [
      {
        path: '/users',
        label: '用户管理',
        requiredPermissions: [Permission.USER_VIEW],
        actions: [],
      },
    ],
    role: Role.CUSTOMER_SERVICE,
  },
}

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      permissions: {
        init: {
          $get: vi.fn(async () => ({
            json: async () => mockInitData,
          })),
        },
        roles: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: [
                { role: Role.SUPER_ADMIN, label: '超级管理员', permissions: [] },
                { role: Role.CUSTOMER_SERVICE, label: '客服人员', permissions: [] },
              ],
            }),
          })),
        },
        $get: vi.fn(async () => ({
          json: async () => ({
            success: true,
            data: [{ permission: Permission.USER_VIEW, label: '查看用户', category: 'user' }],
          }),
        })),
      },
    },
  },
}))

const TestComponent = () => {
  const {
    permissions,
    role,
    menuConfig,
    pagePermissions,
    loading,
    initialized,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  } = usePermissions()

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="initialized">{initialized.toString()}</div>
      <div data-testid="role">{role}</div>
      <div data-testid="permissions">{permissions.join(',')}</div>
      <div data-testid="menu-count">{menuConfig.length}</div>
      <div data-testid="page-permissions-count">{pagePermissions.length}</div>
      <div data-testid="has-user-view">{hasPermission(Permission.USER_VIEW).toString()}</div>
      <div data-testid="has-user-delete">{hasPermission(Permission.USER_DELETE).toString()}</div>
      <div data-testid="has-any">
        {hasAnyPermission([Permission.USER_VIEW, Permission.USER_DELETE]).toString()}
      </div>
      <div data-testid="has-all">
        {hasAllPermissions([Permission.USER_VIEW, Permission.CONTENT_VIEW]).toString()}
      </div>
    </div>
  )
}

describe('usePermissions (Zustand)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePermissionStore.setState({
      permissions: [],
      role: null,
      roles: [],
      allPermissions: [],
      menuConfig: [],
      pagePermissions: [],
      loading: false,
      initialized: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('should have correct initial state', () => {
    const state = usePermissionStore.getState()
    expect(state.permissions).toEqual([])
    expect(state.role).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.initialized).toBe(false)
  })

  it('should initialize permissions', async () => {
    const { initPermissions } = usePermissionStore.getState()
    await initPermissions()

    const state = usePermissionStore.getState()
    expect(state.permissions).toContain(Permission.USER_VIEW)
    expect(state.role).toBe(Role.CUSTOMER_SERVICE)
    expect(state.initialized).toBe(true)
  })

  it('should provide permission context values', async () => {
    await usePermissionStore.getState().initPermissions()

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('role').textContent).toBe(Role.CUSTOMER_SERVICE)
    expect(screen.getByTestId('permissions').textContent).toContain(Permission.USER_VIEW)
    expect(screen.getByTestId('menu-count').textContent).toBe('2')
    expect(screen.getByTestId('page-permissions-count').textContent).toBe('1')
  })

  it('should correctly check hasPermission', async () => {
    await usePermissionStore.getState().initPermissions()

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-user-view').textContent).toBe('true')
    expect(screen.getByTestId('has-user-delete').textContent).toBe('false')
  })

  it('should correctly check hasAnyPermission', async () => {
    await usePermissionStore.getState().initPermissions()

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-any').textContent).toBe('true')
  })

  it('should correctly check hasAllPermissions', async () => {
    await usePermissionStore.getState().initPermissions()

    render(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('has-all').textContent).toBe('true')
  })

  it('should reset state', async () => {
    await usePermissionStore.getState().initPermissions()
    expect(usePermissionStore.getState().initialized).toBe(true)

    usePermissionStore.getState().reset()
    expect(usePermissionStore.getState().initialized).toBe(false)
    expect(usePermissionStore.getState().permissions).toEqual([])
  })
})

describe('useHasPermission', () => {
  const TestHasPermissionComponent = ({ permission }: { permission: Permission }) => {
    const hasPermission = useHasPermission(permission)
    return <div data-testid="has-permission">{hasPermission.toString()}</div>
  }

  beforeEach(async () => {
    await usePermissionStore.getState().initPermissions()
  })

  it('should return correct permission check result', async () => {
    render(<TestHasPermissionComponent permission={Permission.USER_VIEW} />)

    await waitFor(() => {
      expect(screen.getByTestId('has-permission').textContent).toBe('true')
    })
  })
})

describe('useHasAnyPermission', () => {
  const TestHasAnyPermissionComponent = ({ permissions }: { permissions: Permission[] }) => {
    const hasAny = useHasAnyPermission(permissions)
    return <div data-testid="has-any-permission">{hasAny.toString()}</div>
  }

  beforeEach(async () => {
    await usePermissionStore.getState().initPermissions()
  })

  it('should return true when user has any of the permissions', async () => {
    render(
      <TestHasAnyPermissionComponent permissions={[Permission.USER_VIEW, Permission.USER_DELETE]} />
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-any-permission').textContent).toBe('true')
    })
  })
})

describe('useHasAllPermissions', () => {
  const TestHasAllPermissionsComponent = ({ permissions }: { permissions: Permission[] }) => {
    const hasAll = useHasAllPermissions(permissions)
    return <div data-testid="has-all-permissions">{hasAll.toString()}</div>
  }

  beforeEach(async () => {
    await usePermissionStore.getState().initPermissions()
  })

  it('should return true when user has all permissions', async () => {
    render(
      <TestHasAllPermissionsComponent
        permissions={[Permission.USER_VIEW, Permission.CONTENT_VIEW]}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-all-permissions').textContent).toBe('true')
    })
  })
})

describe('useMenuConfig', () => {
  const TestMenuConfigComponent = () => {
    const { menuConfig, loading, initialized } = useMenuConfig()
    return (
      <div>
        <div data-testid="menu-loading">{loading.toString()}</div>
        <div data-testid="menu-initialized">{initialized.toString()}</div>
        <div data-testid="menu-items">{menuConfig.map(m => m.label).join(',')}</div>
      </div>
    )
  }

  beforeEach(async () => {
    await usePermissionStore.getState().initPermissions()
  })

  it('should return menu config from store', async () => {
    render(<TestMenuConfigComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('menu-initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('menu-items').textContent).toContain('仪表盘')
    expect(screen.getByTestId('menu-items').textContent).toContain('用户管理')
  })
})

describe('usePagePermissions', () => {
  const TestPagePermissionsComponent = () => {
    const { pagePermissions, loading, initialized } = usePagePermissions()
    return (
      <div>
        <div data-testid="page-loading">{loading.toString()}</div>
        <div data-testid="page-initialized">{initialized.toString()}</div>
        <div data-testid="page-count">{pagePermissions.length}</div>
      </div>
    )
  }

  beforeEach(async () => {
    await usePermissionStore.getState().initPermissions()
  })

  it('should return page permissions from store', async () => {
    render(<TestPagePermissionsComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('page-initialized').textContent).toBe('true')
    })

    expect(screen.getByTestId('page-count').textContent).toBe('1')
  })
})
