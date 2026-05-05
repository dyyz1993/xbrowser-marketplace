import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import type { MenuItem } from '@shared/modules/permission'

describe('Permission Routes', () => {
  const authHeaders = { Authorization: 'Bearer test-super-admin-1' }

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/permissions', () => {
    it('should return list of permissions', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)
      }
    })

    it('should return permissions with correct structure', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const firstPermission = data.data[0]
        expect(firstPermission).toHaveProperty('permission')
        expect(firstPermission).toHaveProperty('label')
        expect(firstPermission).toHaveProperty('category')
      }
    })
  })

  describe('GET /api/permissions/roles', () => {
    it('should return list of roles', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.roles.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('should return roles with correct structure', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.roles.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const firstRole = data.data[0]
        expect(firstRole).toHaveProperty('role')
        expect(firstRole).toHaveProperty('label')
        expect(firstRole).toHaveProperty('permissions')
        expect(Array.isArray(firstRole.permissions)).toBe(true)
      }
    })
  })

  describe('GET /api/permissions/menu-config', () => {
    it('should return menu configuration', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['menu-config'].$get({
        headers: authHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)
      }
    })

    it('should return menu items with correct structure', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['menu-config'].$get({
        headers: authHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      if (data.success && data.data.length > 0) {
        const firstItem = data.data[0]
        expect(firstItem).toHaveProperty('path')
        expect(firstItem).toHaveProperty('label')
        expect(firstItem).toHaveProperty('icon')
        expect(firstItem).toHaveProperty('permissions')
      }
    })
  })

  describe('GET /api/permissions/page-permissions', () => {
    it('should return page permissions configuration', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['page-permissions'].$get({
        headers: authHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
      }
    })
  })

  describe('GET /api/permissions/categories', () => {
    it('should return permission categories', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.categories.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(typeof data.data).toBe('object')
      }
    })
  })

  describe('GET /api/permissions/role-labels', () => {
    it('should return role labels', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['role-labels'].$get({
        headers: authHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(typeof data.data).toBe('object')
      }
    })
  })

  describe('GET /api/permissions/permission-labels', () => {
    it('should return permission labels', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['permission-labels'].$get({
        headers: authHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(typeof data.data).toBe('object')
      }
    })
  })

  describe('Error Scenarios', () => {
    it('should handle unauthorized access to /permissions/me', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.me.$get()
      // /permissions/me 需要认证，应该返回 401 或 403
      expect([401, 403]).toContain(res.status)
      // 响应可能是纯文本而不是 JSON，所以不解析 JSON
      const text = await res.text()
      expect(text).toBeDefined()
    })

    it('should handle access to /permissions without auth (public route)', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.$get()
      // /permissions 是公开路由，应该返回 200
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('success')
    })

    it('should handle access to /permissions/roles without auth (public route)', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.roles.$get()
      // /permissions/roles 是公开路由，应该返回 200
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('success')
    })

    it('should handle unauthorized access', async () => {
      const client = createTestClient()
      // 测试未授权访问需要认证的路由
      const res = await client.api.permissions.me.$get()
      // 应该返回 401
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/permissions/my-menu', () => {
    it('should return filtered menu for super admin', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions['my-menu'].$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        expect(data.data.length).toBeGreaterThan(0)
      }
    })

    it('should return filtered menu for customer service', async () => {
      const csAuthHeaders = { Authorization: 'Bearer test-customer-service-1' }
      const client = createTestClient(undefined, { headers: csAuthHeaders })
      const res = await client.api.permissions['my-menu'].$get({
        headers: csAuthHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        const menuPaths = data.data.flatMap((item: MenuItem) =>
          item.children ? item.children.map(c => c.path) : [item.path]
        )
        expect(menuPaths).toContain('/dashboard')
        expect(menuPaths).toContain('/users')
        expect(menuPaths).not.toContain('/system/settings')
      }
    })

    it('should return filtered menu for regular user', async () => {
      const userAuthHeaders = { Authorization: 'Bearer test-user-1' }
      const client = createTestClient(undefined, { headers: userAuthHeaders })
      const res = await client.api.permissions['my-menu'].$get({
        headers: userAuthHeaders,
      })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(Array.isArray(data.data)).toBe(true)
        const menuPaths = data.data.flatMap((item: MenuItem) =>
          item.children ? item.children.map(c => c.path) : [item.path]
        )
        expect(menuPaths).toContain('/dashboard')
        expect(menuPaths).not.toContain('/users')
      }
    })

    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.permissions['my-menu'].$get()
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/permissions/init', () => {
    it('should return all permission data for super admin', async () => {
      const client = createTestClient(undefined, { headers: authHeaders })
      const res = await client.api.permissions.init.$get({ headers: authHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('permissions')
        expect(data.data).toHaveProperty('menuConfig')
        expect(data.data).toHaveProperty('pagePermissions')
        expect(data.data).toHaveProperty('role')
        expect(Array.isArray(data.data.permissions)).toBe(true)
        expect(Array.isArray(data.data.menuConfig)).toBe(true)
        expect(Array.isArray(data.data.pagePermissions)).toBe(true)
        expect(data.data.role).toBe('super_admin')
      }
    })

    it('should return filtered data for customer service', async () => {
      const csAuthHeaders = { Authorization: 'Bearer test-customer-service-1' }
      const client = createTestClient(undefined, { headers: csAuthHeaders })
      const res = await client.api.permissions.init.$get({ headers: csAuthHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.role).toBe('customer_service')
        expect(data.data.permissions).toContain('user:view')
        expect(data.data.permissions).not.toContain('user:delete')
        expect(data.data.permissions).not.toContain('system:settings')
      }
    })

    it('should return filtered data for regular user', async () => {
      const userAuthHeaders = { Authorization: 'Bearer test-user-1' }
      const client = createTestClient(undefined, { headers: userAuthHeaders })
      const res = await client.api.permissions.init.$get({ headers: userAuthHeaders })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.role).toBe('user')
        expect(data.data.permissions).toContain('content:view')
        expect(data.data.permissions).toContain('order:view')
        expect(data.data.permissions).not.toContain('user:view')
      }
    })

    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.permissions.init.$get()
      expect(res.status).toBe(401)
    })
  })
})
