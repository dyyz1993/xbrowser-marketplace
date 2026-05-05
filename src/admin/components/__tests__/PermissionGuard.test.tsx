import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PermissionGuard, PermissionButton, Can, Cannot } from '../PermissionGuard'
import { Permission } from '@shared/modules/permission'

const mockPermissions = {
  permissions: [Permission.USER_VIEW, Permission.USER_EDIT, Permission.CONTENT_VIEW],
  hasPermission: (p: Permission) => mockPermissions.permissions.includes(p),
  hasAnyPermission: (ps: Permission[]) => ps.some(p => mockPermissions.permissions.includes(p)),
  hasAllPermissions: (ps: Permission[]) => ps.every(p => mockPermissions.permissions.includes(p)),
}

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => mockPermissions,
}))

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with single permission', () => {
    it('should render children when user has permission', () => {
      render(
        <PermissionGuard permission={Permission.USER_VIEW}>
          <button>编辑用户</button>
        </PermissionGuard>
      )

      expect(screen.getByText('编辑用户')).toBeInTheDocument()
    })

    it('should not render children when user lacks permission', () => {
      render(
        <PermissionGuard permission={Permission.USER_DELETE}>
          <button>删除用户</button>
        </PermissionGuard>
      )

      expect(screen.queryByText('删除用户')).not.toBeInTheDocument()
    })

    it('should render fallback when user lacks permission', () => {
      render(
        <PermissionGuard permission={Permission.USER_DELETE} fallback={<span>无权限</span>}>
          <button>删除用户</button>
        </PermissionGuard>
      )

      expect(screen.getByText('无权限')).toBeInTheDocument()
      expect(screen.queryByText('删除用户')).not.toBeInTheDocument()
    })
  })

  describe('with multiple permissions', () => {
    it('should render children when user has all permissions (mode=all)', () => {
      render(
        <PermissionGuard permissions={[Permission.USER_VIEW, Permission.USER_EDIT]} mode="all">
          <button>操作</button>
        </PermissionGuard>
      )

      expect(screen.getByText('操作')).toBeInTheDocument()
    })

    it('should not render children when user lacks some permissions (mode=all)', () => {
      render(
        <PermissionGuard permissions={[Permission.USER_VIEW, Permission.USER_DELETE]} mode="all">
          <button>操作</button>
        </PermissionGuard>
      )

      expect(screen.queryByText('操作')).not.toBeInTheDocument()
    })

    it('should render children when user has any permission (mode=any)', () => {
      render(
        <PermissionGuard permissions={[Permission.USER_DELETE, Permission.USER_VIEW]} mode="any">
          <button>操作</button>
        </PermissionGuard>
      )

      expect(screen.getByText('操作')).toBeInTheDocument()
    })

    it('should not render children when user has no permissions (mode=any)', () => {
      render(
        <PermissionGuard
          permissions={[Permission.USER_DELETE, Permission.SYSTEM_SETTINGS]}
          mode="any"
        >
          <button>操作</button>
        </PermissionGuard>
      )

      expect(screen.queryByText('操作')).not.toBeInTheDocument()
    })
  })
})

describe('PermissionButton', () => {
  it('should render button when user has permission', () => {
    render(
      <PermissionButton permission={Permission.USER_VIEW} onClick={() => {}}>
        点击
      </PermissionButton>
    )

    expect(screen.getByText('点击')).toBeInTheDocument()
  })

  it('should not render button when user lacks permission', () => {
    render(
      <PermissionButton permission={Permission.USER_DELETE} onClick={() => {}}>
        删除
      </PermissionButton>
    )

    expect(screen.queryByText('删除')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', () => {
    render(
      <PermissionButton
        permission={Permission.USER_DELETE}
        fallback={<span>无权限</span>}
        onClick={() => {}}
      >
        删除
      </PermissionButton>
    )

    expect(screen.getByText('无权限')).toBeInTheDocument()
  })
})

describe('Can', () => {
  it('should render children when user has single permission', () => {
    render(
      <Can I={Permission.USER_VIEW}>
        <div>内容</div>
      </Can>
    )

    expect(screen.getByText('内容')).toBeInTheDocument()
  })

  it('should render children when user has all permissions (array)', () => {
    render(
      <Can I={[Permission.USER_VIEW, Permission.USER_EDIT]} mode="all">
        <div>内容</div>
      </Can>
    )

    expect(screen.getByText('内容')).toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', () => {
    render(
      <Can I={Permission.USER_DELETE} fallback={<div>无权限</div>}>
        <div>删除内容</div>
      </Can>
    )

    expect(screen.getByText('无权限')).toBeInTheDocument()
    expect(screen.queryByText('删除内容')).not.toBeInTheDocument()
  })
})

describe('Cannot', () => {
  it('should render children when user lacks permission', () => {
    render(
      <Cannot I={Permission.USER_DELETE}>
        <div>无删除权限提示</div>
      </Cannot>
    )

    expect(screen.getByText('无删除权限提示')).toBeInTheDocument()
  })

  it('should not render children when user has permission', () => {
    render(
      <Cannot I={Permission.USER_VIEW}>
        <div>无查看权限提示</div>
      </Cannot>
    )

    expect(screen.queryByText('无查看权限提示')).not.toBeInTheDocument()
  })

  it('should render fallback when user has permission', () => {
    render(
      <Cannot I={Permission.USER_VIEW} fallback={<div>有权限</div>}>
        <div>无权限提示</div>
      </Cannot>
    )

    expect(screen.getByText('有权限')).toBeInTheDocument()
    expect(screen.queryByText('无权限提示')).not.toBeInTheDocument()
  })

  it('should work with multiple permissions (mode=all)', () => {
    render(
      <Cannot I={[Permission.USER_DELETE, Permission.SYSTEM_SETTINGS]} mode="all">
        <div>缺少所有权限</div>
      </Cannot>
    )

    expect(screen.getByText('缺少所有权限')).toBeInTheDocument()
  })

  it('should work with multiple permissions when user has some (mode=all)', () => {
    render(
      <Cannot I={[Permission.USER_VIEW, Permission.USER_DELETE]} mode="all">
        <div>缺少所有权限</div>
      </Cannot>
    )

    expect(screen.queryByText('缺少所有权限')).toBeInTheDocument()
  })
})
