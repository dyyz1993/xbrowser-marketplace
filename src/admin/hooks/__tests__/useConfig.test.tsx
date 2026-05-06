import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import {
  useMenuConfig,
  usePagePermissions,
  usePermissionCategories,
  useRoleLabels,
  usePermissionLabels,
  useConfig,
} from '../useConfig'

function createTestComponent(
  hookFn: () => { loading: boolean; [key: string]: unknown },
  testId: string,
  valueExtractor: (result: ReturnType<typeof hookFn>) => string
) {
  return function TestComponent() {
    const result = hookFn()
    return (
      <div>
        <div data-testid={`${testId}-loading`}>{result.loading.toString()}</div>
        <div data-testid={`${testId}-value`}>{valueExtractor(result)}</div>
      </div>
    )
  }
}

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      permissions: {
        'menu-config': {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: [
                { path: '/dashboard', label: '仪表盘', icon: 'LayoutDashboard', permissions: [] },
                { path: '/users', label: '用户管理', icon: 'Users', permissions: ['user:view'] },
              ],
            }),
          })),
        },
        'page-permissions': {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: [
                {
                  path: '/users',
                  label: '用户管理',
                  requiredPermissions: ['user:view'],
                  actions: [],
                },
              ],
            }),
          })),
        },
        categories: {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: {
                user: { label: '用户管理', permissions: ['user:view', 'user:create'] },
                content: { label: '内容管理', permissions: ['content:view'] },
              },
            }),
          })),
        },
        'role-labels': {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: { super_admin: '超级管理员', customer_service: '客服人员' },
            }),
          })),
        },
        'permission-labels': {
          $get: vi.fn(async () => ({
            json: async () => ({
              success: true,
              data: { 'user:view': '查看用户', 'user:create': '创建用户' },
            }),
          })),
        },
        $get: vi.fn(async () => ({
          json: async () => ({
            success: true,
            data: [
              { permission: 'user:view', label: '查看用户', category: 'user' },
              { permission: 'user:create', label: '创建用户', category: 'user' },
            ],
          }),
        })),
      },
    },
  },
}))

describe('useMenuConfig', () => {
  afterEach(cleanup)

  it('should start loading and then show menu config', async () => {
    const TestComp = createTestComponent(
      useMenuConfig,
      'menu',
      r => (r.menuConfig as { label: string }[]).map((m: { label: string }) => m.label).join(',')
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('menu-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('menu-value').textContent).toContain('仪表盘')
    expect(screen.getByTestId('menu-value').textContent).toContain('用户管理')
  })

  it('should handle API error gracefully', async () => {
    const { apiClient } = await import('../../services/apiClient')
    vi.mocked(apiClient.api.permissions['menu-config'].$get).mockRejectedValueOnce(
      new Error('Failed')
    )

    const TestComp = createTestComponent(
      useMenuConfig,
      'menu',
      r => (r.menuConfig as unknown[]).length.toString()
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('menu-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('menu-value').textContent).toBe('0')
  })
})

describe('usePagePermissions', () => {
  afterEach(cleanup)

  it('should fetch page permissions', async () => {
    const TestComp = createTestComponent(
      usePagePermissions,
      'page',
      r => (r.pagePermissions as unknown[]).length.toString()
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('page-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('page-value').textContent).toBe('1')
  })
})

describe('usePermissionCategories', () => {
  afterEach(cleanup)

  it('should fetch permission categories', async () => {
    const TestComp = createTestComponent(
      usePermissionCategories,
      'categories',
      r => Object.keys(r.categories as Record<string, unknown>).join(',')
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('categories-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('categories-value').textContent).toContain('user')
    expect(screen.getByTestId('categories-value').textContent).toContain('content')
  })
})

describe('useRoleLabels', () => {
  afterEach(cleanup)

  it('should fetch role labels', async () => {
    const TestComp = createTestComponent(
      useRoleLabels,
      'roles',
      r => Object.values(r.roleLabels as Record<string, string>).join(',')
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('roles-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('roles-value').textContent).toContain('超级管理员')
    expect(screen.getByTestId('roles-value').textContent).toContain('客服人员')
  })
})

describe('usePermissionLabels', () => {
  afterEach(cleanup)

  it('should fetch permission labels', async () => {
    const TestComp = createTestComponent(
      usePermissionLabels,
      'plabels',
      r => Object.values(r.permissionLabels as Record<string, string>).join(',')
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('plabels-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('plabels-value').textContent).toContain('查看用户')
    expect(screen.getByTestId('plabels-value').textContent).toContain('创建用户')
  })
})

describe('useConfig', () => {
  afterEach(cleanup)

  it('should fetch all permissions', async () => {
    const TestComp = createTestComponent(
      useConfig,
      'config',
      r => (r.permissions as unknown[]).length.toString()
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('config-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('config-value').textContent).toBe('2')
  })

  it('should handle API error gracefully', async () => {
    const { apiClient } = await import('../../services/apiClient')
    vi.mocked(apiClient.api.permissions.$get).mockRejectedValueOnce(new Error('Failed'))

    const TestComp = createTestComponent(
      useConfig,
      'config',
      r => (r.permissions as unknown[]).length.toString()
    )

    render(<TestComp />)

    await waitFor(() => {
      expect(screen.getByTestId('config-loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('config-value').textContent).toBe('0')
  })
})
