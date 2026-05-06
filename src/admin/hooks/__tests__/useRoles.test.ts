import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRoleStore } from '../useRoles'
import type { RoleType } from '@shared/modules/role/schemas'

const { mockRoles, mockRolesGet, mockRolesPost, mockRolesPut, mockRolesDelete, mockPermissionsPut } = vi.hoisted(() => {
  const roles: RoleType[] = [
    {
      id: 'role-1',
      code: 'super_admin',
      name: 'super_admin',
      label: '超级管理员',
      description: 'Full access',
      isSystem: true,
      isActive: true,
      sortOrder: 1,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'role-2',
      code: 'customer_service',
      name: 'customer_service',
      label: '客服人员',
      description: 'Limited access',
      isSystem: false,
      isActive: true,
      sortOrder: 2,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
  ]

  const get = vi.fn(async () => ({ json: async () => ({ success: true, data: roles }) }))
  const post = vi.fn(async () => ({ json: async () => ({ success: true }) }))
  const put = vi.fn(async () => ({ json: async () => ({ success: true }) }))
  const del = vi.fn(async () => ({ json: async () => ({ success: true }) }))
  const permissionsPut = vi.fn(async () => ({ json: async () => ({ success: true }) }))

  return { mockRoles: roles, mockRolesGet: get, mockRolesPost: post, mockRolesPut: put, mockRolesDelete: del, mockPermissionsPut: permissionsPut }
})

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      roles: {
        $get: mockRolesGet,
        $post: mockRolesPost,
        ':id': {
          $put: mockRolesPut,
          $delete: mockRolesDelete,
          permissions: {
            $put: mockPermissionsPut,
          },
        },
      },
    },
  },
}))

describe('useRoleStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRoleStore.setState({
      roles: [],
      loading: false,
      error: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useRoleStore.getState()
    expect(state.roles).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should fetch roles successfully', async () => {
    const { fetchRoles } = useRoleStore.getState()
    await fetchRoles()

    const state = useRoleStore.getState()
    expect(state.roles).toHaveLength(2)
    expect(state.roles[0].code).toBe('super_admin')
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set loading during fetch', async () => {
    let loadingDuringFetch = false

    mockRolesGet.mockImplementationOnce(async () => {
      loadingDuringFetch = useRoleStore.getState().loading
      return { json: async () => ({ success: true, data: mockRoles }) }
    })

    const promise = useRoleStore.getState().fetchRoles()
    expect(loadingDuringFetch).toBe(true)

    await promise
    expect(useRoleStore.getState().loading).toBe(false)
  })

  it('should handle fetch error', async () => {
    mockRolesGet.mockRejectedValueOnce(new Error('Network error'))

    const { fetchRoles } = useRoleStore.getState()
    await fetchRoles()

    const state = useRoleStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch returning success: false', async () => {
    mockRolesGet.mockResolvedValueOnce({
      json: async () => ({ success: false, data: null }),
    } as unknown as Awaited<ReturnType<typeof mockRolesGet>>)

    const { fetchRoles } = useRoleStore.getState()
    await fetchRoles()

    const state = useRoleStore.getState()
    expect(state.error).toBe('Failed to fetch roles')
    expect(state.loading).toBe(false)
  })

  it('should create a role and refresh list', async () => {
    const newRole = { code: 'editor', name: 'editor', label: '编辑人员' }

    const result = await useRoleStore.getState().createRole(newRole)

    expect(result).toBe(true)
    expect(mockRolesPost).toHaveBeenCalledWith({ json: newRole })
    expect(mockRolesGet).toHaveBeenCalled()
  })

  it('should handle create role failure', async () => {
    mockRolesPost.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Role code already exists' }),
    })

    const result = await useRoleStore.getState().createRole({
      code: 'duplicate',
      name: 'duplicate',
      label: 'Duplicate',
    })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Role code already exists')
  })

  it('should handle create role exception', async () => {
    mockRolesPost.mockRejectedValueOnce(new Error('Server error'))

    const result = await useRoleStore.getState().createRole({
      code: 'test',
      name: 'test',
      label: 'Test',
    })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Server error')
  })

  it('should update a role and refresh list', async () => {
    const updateData = { name: 'updated_name', label: 'Updated Label' }

    const result = await useRoleStore.getState().updateRole('role-1', updateData)

    expect(result).toBe(true)
    expect(mockRolesPut).toHaveBeenCalledWith({
      param: { id: 'role-1' },
      json: updateData,
    })
    expect(mockRolesGet).toHaveBeenCalled()
  })

  it('should handle update role failure', async () => {
    mockRolesPut.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Role not found' }),
    })

    const result = await useRoleStore.getState().updateRole('nonexistent', { name: 'x' })

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Role not found')
  })

  it('should delete a role and refresh list', async () => {
    const result = await useRoleStore.getState().deleteRole('role-2')

    expect(result).toBe(true)
    expect(mockRolesDelete).toHaveBeenCalledWith({ param: { id: 'role-2' } })
    expect(mockRolesGet).toHaveBeenCalled()
  })

  it('should handle delete role failure', async () => {
    mockRolesDelete.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Cannot delete system role' }),
    })

    const result = await useRoleStore.getState().deleteRole('role-1')

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Cannot delete system role')
  })

  it('should update role permissions', async () => {
    const permissionIds = ['perm-1', 'perm-2', 'perm-3']

    const result = await useRoleStore.getState().updateRolePermissions('role-1', permissionIds)

    expect(result).toBe(true)
    expect(mockPermissionsPut).toHaveBeenCalledWith({
      param: { id: 'role-1' },
      json: { permissionIds },
    })
  })

  it('should handle update role permissions failure', async () => {
    mockPermissionsPut.mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Invalid permissions' }),
    })

    const result = await useRoleStore.getState().updateRolePermissions('role-1', ['invalid'])

    expect(result).toBe(false)
    expect(useRoleStore.getState().error).toBe('Invalid permissions')
  })
})
