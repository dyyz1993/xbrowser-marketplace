import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { corsMiddleware } from '../cors'

describe('CORS Middleware', () => {
  let app: Hono

  function setupApp(corsOptions?: Parameters<typeof corsMiddleware>[0]) {
    app = new Hono()
    app.use('*', corsMiddleware(corsOptions))
    app.get('/api/data', c => c.json({ success: true }))
    app.post('/api/data', c => c.json({ success: true }))
    return app
  }

  describe('default CORS behavior', () => {
    beforeEach(() => setupApp())

    it('should set Access-Control-Allow-Origin for allowed origin', async () => {
      const res = await app.request('/api/data', {
        headers: { Origin: 'http://localhost:3010' },
      })
      expect(res.status).toBe(200)
      const origin = res.headers.get('Access-Control-Allow-Origin')
      expect(origin).toBe('http://localhost:3010')
    })

    it('should include credentials header', async () => {
      const res = await app.request('/api/data', {
        headers: { Origin: 'http://localhost:3010' },
      })
      const credentials = res.headers.get('Access-Control-Allow-Credentials')
      expect(credentials).toBe('true')
    })

    it('should handle OPTIONS preflight request', async () => {
      const res = await app.request('/api/data', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3010',
          'Access-Control-Request-Method': 'POST',
        },
      })
      expect(res.status).toBe(204)
    })

    it('should set Access-Control-Allow-Methods on preflight', async () => {
      const res = await app.request('/api/data', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3010',
          'Access-Control-Request-Method': 'POST',
        },
      })
      const methods = res.headers.get('Access-Control-Allow-Methods')
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('PUT')
      expect(methods).toContain('DELETE')
    })

    it('should set Access-Control-Allow-Headers on preflight', async () => {
      const res = await app.request('/api/data', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3010',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      })
      const headers = res.headers.get('Access-Control-Allow-Headers')
      expect(headers).toContain('Content-Type')
      expect(headers).toContain('Authorization')
    })
  })

  describe('custom CORS options', () => {
    it('should use custom origin', async () => {
      setupApp({ origin: 'https://example.com' })

      const res = await app.request('/api/data', {
        headers: { Origin: 'https://example.com' },
      })
      const origin = res.headers.get('Access-Control-Allow-Origin')
      expect(origin).toBe('https://example.com')
    })

    it('should use custom allowMethods', async () => {
      setupApp({ allowMethods: ['GET', 'POST'] })

      const res = await app.request('/api/data', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3010',
          'Access-Control-Request-Method': 'POST',
        },
      })
      const methods = res.headers.get('Access-Control-Allow-Methods')
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
    })

    it('should disable credentials when set to false', async () => {
      setupApp({ credentials: false })

      const res = await app.request('/api/data', {
        headers: { Origin: 'http://localhost:3010' },
      })
      const credentials = res.headers.get('Access-Control-Allow-Credentials')
      expect(credentials).toBeNull()
    })

    it('should use custom allowHeaders', async () => {
      setupApp({ allowHeaders: ['X-Custom-Header'] })

      const res = await app.request('/api/data', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:3010',
          'Access-Control-Request-Headers': 'X-Custom-Header',
        },
      })
      const headers = res.headers.get('Access-Control-Allow-Headers')
      expect(headers).toContain('X-Custom-Header')
    })
  })

  describe('passthrough', () => {
    it('should not modify response body', async () => {
      setupApp()

      const res = await app.request('/api/data', {
        headers: { Origin: 'http://localhost:3010' },
      })
      const data = (await res.json()) as { success: boolean }
      expect(data.success).toBe(true)
    })
  })
})
