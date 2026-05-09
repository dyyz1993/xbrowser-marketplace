import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PermissionConfigEditor } from '../PermissionConfigEditor'
import type { PermissionInfo } from '@shared/modules/permission'
import { Permission } from '@shared/modules/permission/permissions'

const mockPermissions: PermissionInfo[] = [
  { permission: Permission.USER_VIEW, label: '查看用户', category: 'user' },
  { permission: Permission.USER_CREATE, label: '创建用户', category: 'user' },
  { permission: Permission.CONTENT_VIEW, label: '查看内容', category: 'content' },
]

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
  }
})

const defaultProps = {
  visible: true,
  title: 'Edit Permissions',
  permissions: mockPermissions,
  selectedPermissions: ['user:view', 'content:view'] as string[],
  onCancel: vi.fn(),
  onOk: vi.fn(),
}

describe('PermissionConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render nothing when not visible', () => {
    render(<PermissionConfigEditor {...defaultProps} visible={false} />)
    expect(screen.queryByText('JSON编辑器')).not.toBeInTheDocument()
  })

  it('should render JSON editor tab when visible', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    expect(screen.getByText('JSON编辑器')).toBeInTheDocument()
  })

  it('should display selected permissions as JSON', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    expect(textarea).toBeInTheDocument()
    expect(JSON.parse((textarea as HTMLTextAreaElement).value)).toEqual([
      'user:view',
      'content:view',
    ])
  })

  it('should render template tab', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    expect(screen.getByText('权限模板')).toBeInTheDocument()
  })

  it('should render help tab', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    expect(screen.getByText('帮助')).toBeInTheDocument()
  })

  it('should render permission list in help tab', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('帮助'))
    expect(screen.getByText('权限配置说明')).toBeInTheDocument()
  })

  it('should call onOk with valid permissions on save', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const saveButton = screen.getByText('保存')
    fireEvent.click(saveButton)
    expect(defaultProps.onOk).toHaveBeenCalledWith(['user:view', 'content:view'])
  })

  it('should not call onOk when JSON is invalid', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: 'invalid json' } })
    fireEvent.click(screen.getByText('保存'))
    expect(defaultProps.onOk).not.toHaveBeenCalled()
  })

  it('should not call onOk when JSON is not an array', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '{"key": "value"}' } })
    fireEvent.click(screen.getByText('保存'))
    expect(defaultProps.onOk).not.toHaveBeenCalled()
  })

  it('should show error for invalid permissions in JSON', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    const textarea = screen.getByPlaceholderText('["permission1", "permission2"]')
    fireEvent.change(textarea, { target: { value: '["nonexistent:perm"]' } })
    fireEvent.click(screen.getByText('保存'))
    expect(screen.getByText(/无效的权限/)).toBeInTheDocument()
  })

  it('should render template buttons', () => {
    render(<PermissionConfigEditor {...defaultProps} />)
    fireEvent.click(screen.getByText('权限模板'))
    expect(screen.getByText('超级管理员')).toBeInTheDocument()
    expect(screen.getByText('客服人员')).toBeInTheDocument()
    expect(screen.getByText('普通用户')).toBeInTheDocument()
  })
})
