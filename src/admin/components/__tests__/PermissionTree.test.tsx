import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionTree } from '../PermissionTree'
import type { PermissionInfo, PermissionCategory } from '@shared/modules/permission'
import { Permission } from '@shared/modules/permission/permissions'

const mockPermissions: PermissionInfo[] = [
  { permission: Permission.USER_VIEW, label: '查看用户', category: 'user' },
  { permission: Permission.USER_CREATE, label: '创建用户', category: 'user' },
  { permission: Permission.USER_EDIT, label: '编辑用户', category: 'user' },
  { permission: Permission.CONTENT_VIEW, label: '查看内容', category: 'content' },
  { permission: Permission.CONTENT_CREATE, label: '创建内容', category: 'content' },
]

const mockCategories: Record<string, PermissionCategory> = {
  user: { label: '用户管理', permissions: [Permission.USER_VIEW, Permission.USER_CREATE, Permission.USER_EDIT] },
  content: { label: '内容管理', permissions: [Permission.CONTENT_VIEW, Permission.CONTENT_CREATE] },
}

vi.mock('@shared/modules/permission/permission-dependencies', () => ({
  PERMISSION_DEPENDENCIES: {
    'user:create': ['user:view'],
    'user:edit': ['user:view'],
    'content:create': ['content:view'],
  },
  getRequiredPermissions: (perm: string) => {
    const deps: Record<string, string[]> = {
      'user:create': ['user:view'],
      'user:edit': ['user:view'],
      'content:create': ['content:view'],
    }
    return deps[perm] || []
  },
}))

const defaultProps = {
  permissions: mockPermissions,
  categories: mockCategories,
  selectedPermissions: [] as string[],
  onSelectionChange: vi.fn(),
}

describe('PermissionTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render category labels', () => {
    render(<PermissionTree {...defaultProps} />)
    expect(screen.getByText('用户管理')).toBeInTheDocument()
    expect(screen.getByText('内容管理')).toBeInTheDocument()
  })

  it('should render permission labels after expanding', () => {
    render(<PermissionTree {...defaultProps} />)
    fireEvent.click(screen.getByText('展开全部'))
    expect(screen.getByText('查看用户')).toBeInTheDocument()
    expect(screen.getByText('创建用户')).toBeInTheDocument()
    expect(screen.getByText('查看内容')).toBeInTheDocument()
  })

  it('should render search input', () => {
    render(<PermissionTree {...defaultProps} />)
    expect(screen.getByPlaceholderText('搜索权限...')).toBeInTheDocument()
  })

  it('should filter permissions by search text', () => {
    render(<PermissionTree {...defaultProps} />)
    fireEvent.click(screen.getByText('展开全部'))
    const input = screen.getByPlaceholderText('搜索权限...')
    fireEvent.change(input, { target: { value: '查看' } })

    expect(screen.getByText('查看用户')).toBeInTheDocument()
    expect(screen.getByText('查看内容')).toBeInTheDocument()
    expect(screen.queryByText('创建用户')).not.toBeInTheDocument()
  })

  it('should show selected count', () => {
    render(<PermissionTree {...defaultProps} selectedPermissions={['user:view']} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should call onSelectionChange with all permissions on select all', () => {
    render(<PermissionTree {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const selectAllBtn = buttons.find(b => b.textContent?.replace(/\s/g, '').includes('全选'))
    expect(selectAllBtn).toBeTruthy()
    fireEvent.click(selectAllBtn!)
    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith(
      mockPermissions.map(p => p.permission)
    )
  })

  it('should call onSelectionChange with empty on clear all', () => {
    render(<PermissionTree {...defaultProps} selectedPermissions={['user:view']} />)
    const buttons = screen.getAllByRole('button')
    const clearBtn = buttons.find(b => b.textContent?.replace(/\s/g, '').includes('清空'))
    expect(clearBtn).toBeTruthy()
    fireEvent.click(clearBtn!)
    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([])
  })

  it('should render action buttons', () => {
    render(<PermissionTree {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    const buttonTexts = buttons.map(btn => btn.textContent?.replace(/\s/g, '') || '')
    expect(buttonTexts.some(t => t.includes('全选'))).toBe(true)
    expect(buttonTexts.some(t => t.includes('清空'))).toBe(true)
    expect(buttonTexts.some(t => t.includes('展开全部'))).toBe(true)
    expect(buttonTexts.some(t => t.includes('收起全部'))).toBe(true)
  })
})
