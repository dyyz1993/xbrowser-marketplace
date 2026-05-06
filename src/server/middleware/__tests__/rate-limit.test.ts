import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimitMiddleware } from '../rate-limit'

const setNodeEnv = (value: string) => {
  ;(process.env as Record<string, string>).NODE_ENV = value
}

describe('Rate Limit Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.onError((err, c) => c.json({ success: false, error: err.message }, 500))
  })

  describe('NODE_ENV=test bypass', () => {
    it('should bypass rate limiting when NODE_ENV is test', async () => {
      app.use('/api', rateLimitMiddleware({ max: 1, windowMs: 60000 }))
      app.get('/api', c => c.json({ success: true }))

      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api')
        expect(res.status).toBe(200)
      }
    })

    it('should bypass even with very restrictive limits in test env', async () => {
      app.use('/api', rateLimitMiddleware({ max: 1, windowMs: 1 }))
      app.get('/api', c => c.json({ success: true }))

      const results = await Promise.all([
        app.request('/api'),
        app.request('/api'),
        app.request('/api'),
      ])
      for (const res of results) {
        expect(res.status).toBe(200)
      }
    })
  })

  describe('rate limiting logic (non-test env)', () => {
    let originalEnv: string | undefined

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV
    })

    const cleanup = () => {
      setNodeEnv(originalEnv ?? 'test')
    }

    it('should block requests exceeding max in window', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware({ max: 2, windowMs: 60000 }))
      limitedApp.get('/limited', c => c.json({ success: true }))

      const res1 = await limitedApp.request('/limited')
      expect(res1.status).toBe(200)

      const res2 = await limitedApp.request('/limited')
      expect(res2.status).toBe(200)

      const res3 = await limitedApp.request('/limited')
      expect(res3.status).toBe(429)
      const body = (await res3.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
      expect(body.error).toBe('Too many requests')

      cleanup()
    })

    it('should set Retry-After header when rate limited', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware({ max: 1, windowMs: 60000 }))
      limitedApp.get('/limited', c => c.json({ success: true }))

      await limitedApp.request('/limited')
      const res = await limitedApp.request('/limited')

      expect(res.status).toBe(429)
      const retryAfter = res.headers.get('Retry-After')
      expect(retryAfter).not.toBeNull()
      expect(Number(retryAfter)).toBeGreaterThan(0)

      cleanup()
    })

    it('should use custom message when provided', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use(
        '/limited',
        rateLimitMiddleware({ max: 1, windowMs: 60000, message: 'Custom limit' })
      )
      limitedApp.get('/limited', c => c.json({ success: true }))

      await limitedApp.request('/limited')
      const res = await limitedApp.request('/limited')

      const body = (await res.json()) as { error: string }
      expect(body.error).toBe('Custom limit')

      cleanup()
    })

    it('should identify client by x-forwarded-for header', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware({ max: 1, windowMs: 60000 }))
      limitedApp.get('/limited', c => c.json({ success: true }))

      await limitedApp.request('/limited', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      })

      const res = await limitedApp.request('/limited', {
        headers: { 'x-forwarded-for': '1.1.1.1' },
      })
      expect(res.status).toBe(429)

      const otherRes = await limitedApp.request('/limited', {
        headers: { 'x-forwarded-for': '2.2.2.2' },
      })
      expect(otherRes.status).toBe(200)

      cleanup()
    })

    it('should identify client by x-real-ip header', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware({ max: 1, windowMs: 60000 }))
      limitedApp.get('/limited', c => c.json({ success: true }))

      await limitedApp.request('/limited', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })

      const res = await limitedApp.request('/limited', {
        headers: { 'x-real-ip': '10.0.0.1' },
      })
      expect(res.status).toBe(429)

      cleanup()
    })

    it('should use default options when none provided', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware())
      limitedApp.get('/limited', c => c.json({ success: true }))

      const res = await limitedApp.request('/limited')
      expect(res.status).toBe(200)

      cleanup()
    })

    it('should handle x-forwarded-for with multiple IPs (use first)', async () => {
      setNodeEnv('development')

      const limitedApp = new Hono()
      limitedApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      limitedApp.use('/limited', rateLimitMiddleware({ max: 1, windowMs: 60000 }))
      limitedApp.get('/limited', c => c.json({ success: true }))

      await limitedApp.request('/limited', {
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
      })

      const res = await limitedApp.request('/limited', {
        headers: { 'x-forwarded-for': '1.1.1.1, 3.3.3.3' },
      })
      expect(res.status).toBe(429)

      cleanup()
    })
  })
})
