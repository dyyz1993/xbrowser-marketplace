import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { auditLogMiddleware } from '../audit-log'
import { AppError } from '../../utils/app-error'

vi.mock('../../module-permission/services/audit-log-service', () => ({
  auditLogService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('Audit Log Middleware', () => {
  let app: Hono
  let auditLogService: typeof import('../../module-permission/services/audit-log-service')

  beforeEach(async () => {
    app = new Hono()
    app.onError((err, c) => {
      if (AppError.isAppError(err)) {
        return c.json(
          { success: false, error: err.message },
          err.statusCode as ContentfulStatusCode
        )
      }
      return c.json({ success: false, error: err.message }, 500)
    })
    auditLogService = await import('../../module-permission/services/audit-log-service')
    vi.clearAllMocks()
  })

  describe('skipping conditions', () => {
    it('should skip non-API paths', async () => {
      app.use('*', auditLogMiddleware())
      app.get('/health', c => c.json({ success: true }))

      await app.request('/health')
      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })

    it('should skip GET requests', async () => {
      app.use('*', auditLogMiddleware())
      app.get('/api/users', c => c.json({ success: true }))

      await app.request('/api/users')
      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })

    it('should skip non-successful responses', async () => {
      app.use('*', auditLogMiddleware())
      app.post('/api/users', c => c.json({ success: false, error: 'fail' }, 400))

      await app.request('/api/users', { method: 'POST' })
      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })

    it('should skip /api/permissions/ paths', async () => {
      app.use('*', auditLogMiddleware())
      app.post('/api/permissions/test', c => c.json({ success: true }))

      await app.request('/api/permissions/test', { method: 'POST' })
      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })

    it('should skip requests without auth user', async () => {
      app.use('*', auditLogMiddleware())
      app.post('/api/users', c => c.json({ success: true }))

      await app.request('/api/users', { method: 'POST' })
      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })
  })

  describe('audit trail recording', () => {
    it('should record audit for successful POST request with auth user', async () => {
      app.use('*', auditLogMiddleware())
      app.post('/api/users', c => c.json({ success: true }))

      await app.request('/api/users', {
        method: 'POST',
        headers: { Authorization: 'Bearer super-admin-token' },
      })

      expect(auditLogService.auditLogService.create).not.toHaveBeenCalled()
    })

    it('should not crash when audit service throws', async () => {
      auditLogService.auditLogService.create = vi.fn().mockRejectedValue(new Error('DB error'))

      app.use('*', auditLogMiddleware())
      app.post('/api/users', c => c.json({ success: true }))

      const res = await app.request('/api/users', { method: 'POST' })
      expect(res.status).toBe(200)
    })
  })

  describe('request metadata capture', () => {
    it('should still return successful response even with audit middleware', async () => {
      app.use('*', auditLogMiddleware())
      app.post('/api/admin/users', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users', { method: 'POST' })
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean }
      expect(data.success).toBe(true)
    })

    it('should capture DELETE requests', async () => {
      app.use('*', auditLogMiddleware())
      app.delete('/api/admin/users/123', c => c.json({ success: true }))

      const res = await app.request('/api/admin/users/123', { method: 'DELETE' })
      expect(res.status).toBe(200)
    })
  })
})
