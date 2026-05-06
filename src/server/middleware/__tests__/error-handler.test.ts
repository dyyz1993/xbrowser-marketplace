import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { errorHandlerMiddleware } from '../error-handler'
import { ValidationError, NotFoundError, AuthorizationError } from '../../utils/app-error'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

describe('Error Handler Middleware', () => {
  let app: Hono

  function setupApp(options?: { includeStackTrace?: boolean; logErrors?: boolean }) {
    app = new Hono()
    const middleware = errorHandlerMiddleware(options)
    app.onError(
      (err, c) =>
        middleware(c, async () => {
          throw err
        }) as Promise<Response>
    )
    app.get('/test', c => c.json({ success: true }))
    app.get('/test/app-error', () => {
      throw new ValidationError('Invalid input')
    })
    app.get('/test/not-found', () => {
      throw new NotFoundError('User', '123')
    })
    app.get('/test/auth-error', () => {
      throw new AuthorizationError('Forbidden')
    })
    app.get('/test/zod-error', c => {
      const result = z.object({ email: z.string().email() }).safeParse({ email: 'invalid' })
      if (!result.success) throw result.error
      return c.json({ success: true })
    })
    app.get('/test/http-exception', () => {
      throw new HTTPException(404, { message: 'Not found' })
    })
    app.get('/test/generic-error', () => {
      throw new Error('Something went wrong')
    })
    app.get('/test/non-error', () => {
      throw 'string error'
    })
    return app
  }

  describe('successful request passthrough', () => {
    beforeEach(() => setupApp())

    it('should pass through successful requests', async () => {
      const res = await app.request('/test')
      expect(res.status).toBe(200)
      const data = (await res.json()) as { success: boolean }
      expect(data.success).toBe(true)
    })
  })

  describe('AppError handling', () => {
    beforeEach(() => setupApp())

    it('should handle ValidationError with 400 status', async () => {
      const res = await app.request('/test/app-error')
      expect(res.status).toBe(400)
      const data = (await res.json()) as { success: boolean; error: string; status: number }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid input')
      expect(data.status).toBe(400)
    })

    it('should handle NotFoundError with 404 status', async () => {
      const res = await app.request('/test/not-found')
      expect(res.status).toBe(404)
      const data = (await res.json()) as { success: boolean; error: string; status: number }
      expect(data.success).toBe(false)
      expect(data.error).toBe('User not found: 123')
      expect(data.status).toBe(404)
    })

    it('should handle AuthorizationError with 403 status', async () => {
      const res = await app.request('/test/auth-error')
      expect(res.status).toBe(403)
      const data = (await res.json()) as { success: boolean; error: string; status: number }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Forbidden')
      expect(data.status).toBe(403)
    })
  })

  describe('ZodError handling', () => {
    beforeEach(() => setupApp())

    it('should handle ZodError with 400 and formatted details', async () => {
      const res = await app.request('/test/zod-error')
      expect(res.status).toBe(400)
      const data = (await res.json()) as { success: boolean; error: string; details: unknown[] }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
      expect(Array.isArray(data.details)).toBe(true)
    })
  })

  describe('HTTPException handling', () => {
    beforeEach(() => setupApp())

    it('should handle HTTPException with correct status', async () => {
      const res = await app.request('/test/http-exception')
      expect(res.status).toBe(404)
      const data = (await res.json()) as { success: boolean; error: string }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Not found')
    })
  })

  describe('unknown error handling', () => {
    it('should handle generic Error with 500 status', async () => {
      setupApp()
      const res = await app.request('/test/generic-error')
      expect(res.status).toBe(500)
      const data = (await res.json()) as { success: boolean; error: string; status: number }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Something went wrong')
      expect(data.status).toBe(500)
    })

    it('should handle non-Error thrown values with 500 status', async () => {
      const stringApp = new Hono()
      const middleware = errorHandlerMiddleware()
      stringApp.use(middleware)
      stringApp.get('/test/non-error', () => {
        throw 'string error'
      })
      const res = await stringApp.request('/test/non-error')
      expect(res.status).toBe(500)
      const data = (await res.json()) as { success: boolean; error: string; status: number }
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
      expect(data.status).toBe(500)
    })

    it('should include stack trace when includeStackTrace is true', async () => {
      setupApp({ includeStackTrace: true, logErrors: false })
      const res = await app.request('/test/generic-error')
      const data = (await res.json()) as { stack: string }
      expect(data.stack).toBeDefined()
      expect(typeof data.stack).toBe('string')
    })

    it('should not include stack trace by default', async () => {
      setupApp()
      const res = await app.request('/test/generic-error')
      const data = (await res.json()) as { stack?: string }
      expect(data.stack).toBeUndefined()
    })
  })

  describe('response format', () => {
    beforeEach(() => setupApp())

    it('should always return JSON content type', async () => {
      const res = await app.request('/test/generic-error')
      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('application/json')
    })

    it('should always include success: false in error responses', async () => {
      const endpoints = [
        '/test/app-error',
        '/test/zod-error',
        '/test/http-exception',
        '/test/generic-error',
      ]

      for (const endpoint of endpoints) {
        const res = await app.request(endpoint)
        const data = (await res.json()) as { success: boolean }
        expect(data.success).toBe(false)
      }
    })
  })
})
