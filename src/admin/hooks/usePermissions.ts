import { create } from 'zustand'
import { useAdminStore } from '../stores/adminStore'
import { apiClient } from '../services/apiClient'
import {
  Permission,
  Role,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from '@shared/modules/permission'
import type {
  RoleInfo,
  PermissionInfo,
  MenuItem,
  PagePermissionConfig,
} from '@shared/modules/permission'

interface PermissionState {
  permissions: Permission[]
  role: Role | null
  roles: RoleInfo[]
  allPermissions: PermissionInfo[]
  menuConfig: MenuItem[]
  pagePermissions: PagePermissionConfig[]
  loading: boolean
  initialized: boolean
  initPermissions: () => Promise<void>
  fetchStaticData: () => Promise<void>
  reset: () => void
}

export const usePermissionStore = create<PermissionState>(set => ({
  permissions: [],
  role: null,
  roles: [],
  allPermissions: [],
  menuConfig: [],
  pagePermissions: [],
  loading: false,
  initialized: false,

  initPermissions: async () => {
    const { isAuthenticated, user } = useAdminStore.getState()

    if (!isAuthenticated || !user) {
      set({
        permissions: [],
        role: null,
        menuConfig: [],
        pagePermissions: [],
        initialized: true,
      })
      return
    }

    try {
      set({ loading: true })
      const response = await apiClient.api.permissions.init.$get()
      const data = await response.json()

      if (data.success) {
        set({
          permissions: data.data.permissions,
          role: data.data.role,
          menuConfig: data.data.menuConfig,
          pagePermissions: data.data.pagePermissions,
          loading: false,
          initialized: true,
        })
      }
    } catch (error) {
      console.error('Failed to fetch user permissions:', error)
      const { user } = useAdminStore.getState()
      set({
        role: user?.role ?? null,
        permissions: [],
        loading: false,
        initialized: true,
      })
    }
  },

  fetchStaticData: async () => {
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        apiClient.api.permissions.roles.$get(),
        apiClient.api.permissions.$get(),
      ])

      const rolesData = await rolesRes.json()
      const permissionsData = await permissionsRes.json()

      if (rolesData.success) {
        set({ roles: rolesData.data })
      }

      if (permissionsData.success) {
        set({ allPermissions: permissionsData.data })
      }
    } catch (error) {
      console.error('Failed to fetch static data:', error)
    }
  },

  reset: () => {
    set({
      permissions: [],
      role: null,
      menuConfig: [],
      pagePermissions: [],
      initialized: false,
    })
  },
}))

export function usePermissions() {
  const store = usePermissionStore()
  const { permissions, initPermissions } = store

  return {
    ...store,
    refreshPermissions: initPermissions,
    hasPermission: (permission: Permission) => hasPermission(permissions, permission),
    hasAnyPermission: (perms: Permission[]) => hasAnyPermission(permissions, perms),
    hasAllPermissions: (perms: Permission[]) => hasAllPermissions(permissions, perms),
  }
}

export function useHasPermission(permission: Permission): boolean {
  const permissions = usePermissionStore(state => state.permissions)
  return hasPermission(permissions, permission)
}

export function useHasAnyPermission(perms: Permission[]): boolean {
  const permissions = usePermissionStore(state => state.permissions)
  return hasAnyPermission(permissions, perms)
}

export function useHasAllPermissions(perms: Permission[]): boolean {
  const permissions = usePermissionStore(state => state.permissions)
  return hasAllPermissions(permissions, perms)
}

export function useMenuConfig() {
  const menuConfig = usePermissionStore(state => state.menuConfig)
  const loading = usePermissionStore(state => state.loading)
  const initialized = usePermissionStore(state => state.initialized)
  return { menuConfig, loading, initialized }
}

export function usePagePermissions() {
  const pagePermissions = usePermissionStore(state => state.pagePermissions)
  const loading = usePermissionStore(state => state.loading)
  const initialized = usePermissionStore(state => state.initialized)
  return { pagePermissions, loading, initialized }
}
