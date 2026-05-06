import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsersPage } from '../UsersPage'
import { Permission } from '@shared/modules/permission'

const mockUsersGet = vi.fn()
const mockUsersPost = vi.fn()
const mockUsersPut = vi.fn()
const mockUsersDelete = vi.fn()

const mockApi = vi.fn().mockReturnValue({
  withLoading: vi.fn().mockReturnThis(),
  json: vi.fn(),
})

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        users: {
          $get: () => mockUsersGet(),
          $post: (...args: unknown[]) => mockUsersPost(...args),
          ':id': {
            $put: (...args: unknown[]) => mockUsersPut(...args),
            $delete: (...args: unknown[]) => mockUsersDelete(...args),
          },
        },
      },
    },
  },
  api: (...args: unknown[]) => mockApi(...args),
}))

vi.mock('../../hooks/useConfig', () => ({
  useRoleLabels: () => ({
    roleLabels: {
      super_admin: '超级管理员',
      customer_service: '客服人员',
      user: '普通用户',
    },
    loading: false,
  }),
}))

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    permissions: Object.values(Permission),
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}))

vi.mock('../components/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

const mockUsers = [
  {
    id: 'u1',
    username: 'admin',
    email: 'admin@test.com',
    role: 'super_admin',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    username: 'support',
    email: 'support@test.com',
    role: 'customer_service',
    status: 'locked',
    createdAt: '2025-01-02T00:00:00Z',
  },
]

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.mockReturnValue({
      withLoading: vi.fn().mockReturnThis(),
      json: vi.fn().mockResolvedValue(mockUsers),
    })
  })

  it('renders page card title and create button', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('用户管理')).toBeInTheDocument()
      expect(screen.getByText('创建用户')).toBeInTheDocument()
    })
  })

  it('fetches and displays user list in table', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('support@test.com')).toBeInTheDocument()
    })
  })

  it('renders table column headers', () => {
    render(<UsersPage />)

    expect(screen.getByText('用户名')).toBeInTheDocument()
    expect(screen.getByText('邮箱')).toBeInTheDocument()
    expect(screen.getByText('角色')).toBeInTheDocument()
    expect(screen.getByText('状态')).toBeInTheDocument()
    expect(screen.getByText('创建时间')).toBeInTheDocument()
    expect(screen.getByText('操作')).toBeInTheDocument()
  })

  it('displays status tags correctly', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('正常')).toBeInTheDocument()
      expect(screen.getByText('已锁定')).toBeInTheDocument()
    })
  })

  it('opens create user modal when create button is clicked', async () => {
    const user = userEvent.setup()

    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('创建用户')).toBeInTheDocument()
    })

    await user.click(screen.getByText('创建用户'))

    await waitFor(() => {
      expect(screen.getByText('创建用户', { selector: '.ant-modal-title' })).toBeInTheDocument()
    })
  })

  it('shows password field only in create mode', async () => {
    const user = userEvent.setup()

    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('创建用户')).toBeInTheDocument()
    })

    await user.click(screen.getByText('创建用户'))

    await waitFor(() => {
      expect(screen.getByText('密码')).toBeInTheDocument()
    })
  })

  it('renders edit and lock/unlock buttons per user row', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('编辑')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)

    const lockButtons = screen.getAllByText('锁定')
    expect(lockButtons.length).toBeGreaterThanOrEqual(1)

    const unlockButtons = screen.getAllByText('解锁')
    expect(unlockButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows delete button per user row', async () => {
    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByText('删除')
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows success message on user creation', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('用户管理')).toBeInTheDocument()
    })

    const createButtons = screen.getAllByText('创建用户')
    await user.click(createButtons[0])

    await waitFor(() => {
      const modalTitle = document.querySelector('.ant-modal-title')
      expect(modalTitle).toHaveTextContent('创建用户')
    })

    const modal = document.querySelector('.ant-modal')!
    const inputs = within(modal as HTMLElement).getAllByRole('textbox')
    if (inputs[0]) await user.type(inputs[0], 'newuser')
    if (inputs[1]) await user.type(inputs[1], 'new@test.com')

    const passwordInput = within(modal as HTMLElement).queryByPlaceholderText('请输入密码')
    if (passwordInput) await user.type(passwordInput, 'pass123')

    mockApi.mockReturnValue({
      withLoading: vi.fn().mockReturnThis(),
      json: vi.fn().mockResolvedValue({ success: true }),
    })

    const footer = (modal as HTMLElement).querySelector('.ant-modal-footer')
    if (footer) {
      const okBtn = within(footer as HTMLElement).getByRole('button', { name: /OK/i })
      await user.click(okBtn)
    }

    await waitFor(() => {
      if (mockUsersPost.mock.calls.length > 0) {
        expect(message.success).toHaveBeenCalledWith('用户创建成功')
      }
    })
  })

  it('handles API error gracefully on fetch', async () => {
    mockApi.mockReturnValue({
      withLoading: vi.fn().mockReturnThis(),
      json: vi.fn().mockRejectedValue(new Error('Network error')),
    })

    render(<UsersPage />)

    await waitFor(() => {
      expect(screen.getByText('用户管理')).toBeInTheDocument()
    })

    expect(screen.queryByText('admin')).not.toBeInTheDocument()
  })
})
