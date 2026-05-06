import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { permissionMiddleware } from '../permission'
import { AppError } from '../../utils/app-error'

vi.mock('../../module-permission/services/permission-service-impl', () => ({
  permissionService: {
    hasPermission: vi.fn().mockResolvedValue(false),
  },
}))

vi.mock('../../module-permission/services/role-service', () => ({
  roleService: {
    getUserRoles: vi.fn().mockResolvedValue([{ code: 'user', name: 'User' }]),
  },
}))

describe('Permission Middleware', () => {
  let app: Hono
  let permissionService: typeof import('../../module-permission/services/permission-service-impl')
  let roleService: typeof import('../../module-permission/services/role-service')

  beforeEach(async () => {
    app = new Hono()
    app.onError((err, c) => {
      if (AppError.isAppError(err)) {
        return c.json({ success: false, error: err.message }, err.statusCode as ContentfulStatusCode)
      }
      return c.json({ success: false, error: err.message }, 500)
    })
    permissionService = await import('../../module-permission/services/permission-service-impl')
    roleService = await import('../../module-permission/services/role-service')
    vi.clearAllMocks()
  })

  describe('public routes', () => {
    it('should allow access to public routes without auth', async () => {
      app.use('*', permissionMiddleware())
      app.post('/api/admin/login', c => c.json({ success: true }))
      app.post('/api/admin/register', c => c.json({ success: true }))
      app.get('/api/permissions', c => c.json({ success: true }))
      app.get('/api/permissions/roles', c => c.json({ success: true }))

      const loginRes = await app.request('/api/admin/login', { method: 'POST' })
      expect(loginRes.status).toBe(200)

      const registerRes = await app.request('/api/admin/register', { method: 'POST' })
      expect(registerRes.status).toBe(200)

      const permRes = await app.request('/api/permissions')
      expect(permRes.status).toBe(200)

      const rolesRes = await app.request('/api/permissions/roles')
      expect(rolesRes.status).toBe(200)
    })

    it('should allow access to public permission categories', async () => {
      app.use('*', permissionMiddleware())
      app.get('/api/permissions/categories', c => c.json({ success: true }))

      const res = await app.request('/api/permissions/categories')
      expect(res.status).toBe(200)
    })
  })

  describe('unmatched routes', () => {
    it('should allow unmatched routes to pass through', async () => {
      app.use('*', permissionMiddleware())
      app.get('/api/unknown', c => c.json({ success: true }))

      const res = await app.request('/api/unknown')
      expect(res.status).toBe(200)
    })
  })

  describe('protected routes without user', () => {
    it('should pass through when no user is set (let auth middleware handle)', async () => {
      app.use('*', permissionMiddleware())
      app.get('/api/admin/users', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(200)
    })
  })

  describe('protected routes with user', () => {
    it('should deny access when user lacks permission', async () => {
      permissionService.permissionService.hasPermission = vi.fn().mockResolvedValue(false)
      roleService.roleService.getUserRoles = vi.fn().mockResolvedValue([{ code: 'user', name: 'User' }])

      app.use('*', async (c, next) => {
        c.set('authUser', { id: 'user-1', role: 'user', username: 'test' } as never)
        await next()
      })
      app.use('*', permissionMiddleware())
      app.get('/api/admin/users', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(403)
      const data = (await res.json()) as { success: boolean; error: string }
      expect(data.success).toBe(false)
      expect(data.error).toContain('Forbidden')
    })

    it('should allow access when user has required permission', async () => {
      permissionService.permissionService.hasPermission = vi.fn().mockResolvedValue(true)
      roleService.roleService.getUserRoles = vi.fn().mockResolvedValue([{ code: 'user', name: 'User' }])

      app.use('*', async (c, next) => {
        c.set('authUser', { id: 'user-1', role: 'user', username: 'test' } as never)
        await next()
      })
      app.use('*', permissionMiddleware())
      app.get('/api/admin/users', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users')
      expect(res.status).toBe(200)
    })

    it('should allow super admin access to any route', async () => {
      roleService.roleService.getUserRoles = vi.fn().mockResolvedValue([{ code: 'super_admin', name: 'Super Admin' }])

      app.use('*', async (c, next) => {
        c.set('authUser', { id: 'admin-1', role: 'super_admin', username: 'admin' } as never)
        await next()
      })
      app.use('*', permissionMiddleware())
      app.delete('/api/admin/users/123', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users/123', { method: 'DELETE' })
      expect(res.status).toBe(200)
    })

    it('should handle content routes', async () => {
      permissionService.permissionService.hasPermission = vi.fn().mockResolvedValue(false)
      roleService.roleService.getUserRoles = vi.fn().mockResolvedValue([{ code: 'user', name: 'User' }])

      app.use('*', async (c, next) => {
        c.set('authUser', { id: 'user-1', role: 'user', username: 'test' } as never)
        await next()
      })
      app.use('*', permissionMiddleware())
      app.post('/api/content', c => c.json({ success: true }))

      const res = await app.request('/api/content', { method: 'POST' })
      expect(res.status).toBe(403)
    })

    it('should handle settings routes', async () => {
      permissionService.permissionService.hasPermission = vi.fn().mockResolvedValue(false)
      roleService.roleService.getUserRoles = vi.fn().mockResolvedValue([{ code: 'user', name: 'User' }])

      app.use('*', async (c, next) => {
        c.set('authUser', { id: 'user-1', role: 'user', username: 'test' } as never)
        await next()
      })
      app.use('*', permissionMiddleware())
      app.get('/api/admin/settings', c => c.json({ success: true }))

      const res = await app.request('/api/admin/settings')
      expect(res.status).toBe(403)
    })
  })
})
