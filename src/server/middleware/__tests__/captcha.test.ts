import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { captchaMiddleware, verifyCaptchaMiddleware, markCaptchaVerifiedMiddleware, clearCaptchaSessionMiddleware } from '../captcha'

const setNodeEnv = (value: string) => {
  ;(process.env as Record<string, string>).NODE_ENV = value
}

describe('Captcha Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.onError((err, c) => c.json({ success: false, error: err.message }, 500))
  })

  describe('NODE_ENV=test bypass', () => {
    it('should bypass captcha when NODE_ENV is test', async () => {
      app.use('/api/data', captchaMiddleware())
      app.get('/api/data', c => c.json({ success: true }))

      const res = await app.request('/api/data')
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean }
      expect(data.success).toBe(true)
    })

    it('should bypass captcha even for bot-like user agents in test env', async () => {
      app.use('/api/data', captchaMiddleware())
      app.get('/api/data', c => c.json({ success: true }))

      const res = await app.request('/api/data', {
        headers: { 'User-Agent': 'bot/1.0' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('skip paths', () => {
    it('should skip default captcha paths', async () => {
      setNodeEnv('development')

      const testApp = new Hono()
      testApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      testApp.use('/api/captcha', captchaMiddleware())
      testApp.get('/api/captcha', c => c.json({ success: true }))

      const res = await testApp.request('/api/captcha')
      expect(res.status).toBe(200)

      setNodeEnv('test')
    })

    it('should skip custom skipPaths', async () => {
      setNodeEnv('development')

      const testApp = new Hono()
      testApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      testApp.use('/custom', captchaMiddleware({ skipPaths: ['/custom'] }))
      testApp.get('/custom', c => c.json({ success: true }))

      const res = await testApp.request('/custom')
      expect(res.status).toBe(200)

      setNodeEnv('test')
    })
  })

  describe('verifyCaptchaMiddleware', () => {
    it('should return 400 when no session_id cookie', async () => {
      app.use('/api/verify', verifyCaptchaMiddleware())
      app.post('/api/verify', c => c.json({ success: true }))

      const res = await app.request('/api/verify', { method: 'POST' })
      expect(res.status).toBe(400)
      const data = (await res.json()) as { success: boolean; error: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Session not found')
    })
  })

  describe('markCaptchaVerifiedMiddleware', () => {
    it('should mark session as verified', () => {
      const sessionId = 'test-session-123'
      markCaptchaVerifiedMiddleware(sessionId)

      clearCaptchaSessionMiddleware(sessionId)
    })
  })

  describe('clearCaptchaSessionMiddleware', () => {
    it('should clear session without error for non-existent session', () => {
      expect(() => clearCaptchaSessionMiddleware('non-existent')).not.toThrow()
    })
  })

  describe('custom config', () => {
    it('should use custom maxRequests and windowMs', async () => {
      setNodeEnv('development')

      const testApp = new Hono()
      testApp.onError((err, c) => c.json({ success: false, error: err.message }, 500))
      testApp.use('/api', captchaMiddleware({ maxRequests: 1, windowMs: 60000 }))
      testApp.get('/api', c => c.json({ success: true }))

      const res1 = await testApp.request('/api', {
        headers: { 'User-Agent': 'Mozilla/5.0 test-browser', Cookie: 'session_id=test-sess' },
      })
      expect(res1.status).toBe(200)

      const res2 = await testApp.request('/api', {
        headers: { 'User-Agent': 'Mozilla/5.0 test-browser', Cookie: 'session_id=test-sess' },
      })
      expect(res2.status).toBe(429)

      setNodeEnv('test')
    })
  })
})
