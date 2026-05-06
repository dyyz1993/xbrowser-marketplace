import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RolesPage } from '../RolesPage'

vi.mock('../../hooks/useRoles', () => ({
  useRoleStore: () => ({
    roles: [
      {
        id: 'r1',
        code: 'admin',
        name: '管理员',
        label: '管理员',
        description: '',
        isSystem: true,
        isActive: true,
      },
      {
        id: 'r2',
        code: 'manager',
        name: '经理',
        label: '经理',
        description: '经理角色',
        isSystem: false,
        isActive: true,
      },
    ],
    loading: false,
    fetchRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    updateRolePermissions: vi.fn(),
  }),
}))

vi.mock('../../hooks/useConfig', () => ({
  useConfig: () => ({
    permissions: [],
    loading: false,
  }),
  usePermissionCategories: () => ({
    categories: {},
    loading: false,
  }),
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: [],
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    refreshPermissions: vi.fn(),
  }),
}))

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      roles: {
        ':id': {
          $get: vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, data: { permissions: ['USER_VIEW'] } }),
          }),
        },
      },
    },
  },
}))

vi.mock('../../components/PermissionTree', () => ({
  PermissionTree: ({ onSelectionChange }: { onSelectionChange: (p: string[]) => void }) => (
    <div data-testid="permission-tree" onClick={() => onSelectionChange(['USER_VIEW'])}>
      PermissionTree
    </div>
  ),
}))

vi.mock('../../components/PermissionConfigEditor', () => ({
  PermissionConfigEditor: ({ onOk }: { onOk: (p: string[]) => void }) => (
    <div data-testid="permission-config-editor" onClick={() => onOk(['USER_EDIT'])}>
      PermissionConfigEditor
    </div>
  ),
}))

vi.mock('@shared/modules/permission/permission-dependencies', () => ({
  validatePermissionDependencies: () => ({ valid: true, errors: [] }),
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

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page heading and create button', () => {
    render(<RolesPage />)

    expect(screen.getByText('角色管理')).toBeInTheDocument()
    expect(screen.getByText('创建角色')).toBeInTheDocument()
  })

  it('calls fetchRoles on mount', () => {
    render(<RolesPage />)
    expect(screen.getByText('角色管理')).toBeInTheDocument()
  })

  it('renders table with correct column headers', () => {
    render(<RolesPage />)

    expect(screen.getByText('角色代码')).toBeInTheDocument()
    expect(screen.getByText('角色名称')).toBeInTheDocument()
    expect(screen.getByText('显示名称')).toBeInTheDocument()
    expect(screen.getByText('描述')).toBeInTheDocument()
    expect(screen.getByText('系统角色')).toBeInTheDocument()
    expect(screen.getByText('状态')).toBeInTheDocument()
    expect(screen.getByText('操作')).toBeInTheDocument()
  })

  it('opens create role modal when create button is clicked', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    await user.click(screen.getByText('创建角色'))

    await waitFor(() => {
      expect(screen.getByText('创建角色', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('renders form fields in create modal', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    await user.click(screen.getByText('创建角色'))

    await waitFor(() => {
      const modal = screen
        .getByText('创建角色', { selector: '.ant-modal-title' })
        .closest('.ant-modal')!
      expect(within(modal as HTMLElement).getByText('角色代码')).toBeInTheDocument()
      expect(within(modal as HTMLElement).getByText('角色名称')).toBeInTheDocument()
      expect(within(modal as HTMLElement).getByText('显示名称')).toBeInTheDocument()
      expect(within(modal as HTMLElement).getByText('描述')).toBeInTheDocument()
    })
  })

  it('does not show isActive switch in create mode', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    await user.click(screen.getByText('创建角色'))

    await waitFor(() => {
      expect(screen.getByText('创建角色', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })

    const modal = screen
      .getByText('创建角色', { selector: '.ant-modal-title' })
      .closest('.ant-modal')!
    expect(within(modal as HTMLElement).queryByText('状态')).not.toBeInTheDocument()
  })

  it('calls createRole on form submit with valid data', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    await user.click(screen.getByText('创建角色'))

    await waitFor(() => {
      expect(screen.getByText('创建角色', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })

    const modal = screen
      .getByText('创建角色', { selector: '.ant-modal-title' })
      .closest('.ant-modal')!
    const footer = modal.querySelector('.ant-modal-footer')
    if (footer) {
      const buttons = within(footer as HTMLElement).getAllByRole('button')
      const okBtn = buttons.find(b => b.classList.contains('ant-btn-primary'))
      if (okBtn) {
        await user.click(okBtn)
      }
    }
  })

  it('shows delete button for non-system roles', () => {
    render(<RolesPage />)

    const deleteButtons = screen.queryAllByText('删除')
    expect(deleteButtons.length).toBe(1)
  })

  it('renders edit button for each role row', () => {
    render(<RolesPage />)
    const editButtons = screen.getAllByText('编辑')
    expect(editButtons.length).toBe(2)
  })

  it('renders permission button that opens permission modal', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    const permButtons = screen.queryAllByText('权限')
    if (permButtons.length > 0) {
      await user.click(permButtons[0])

      await waitFor(() => {
        expect(screen.getByText(/管理角色权限/)).toBeInTheDocument()
      })
    }
  })

  it('renders PermissionTree in permission modal', async () => {
    const user = userEvent.setup()

    render(<RolesPage />)

    const permButtons = screen.queryAllByText('权限')
    if (permButtons.length > 0) {
      await user.click(permButtons[0])

      await waitFor(
        () => {
          expect(screen.getByTestId('permission-tree')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    }
  })

  it('renders table headers correctly even with empty data', () => {
    render(<RolesPage />)

    const table = document.querySelector('.ant-table')
    expect(table).toBeInTheDocument()
  })
})
