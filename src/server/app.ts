import { OpenAPIHono } from '@hono/zod-openapi'

import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import type { AppBindings, CreateAppOptions } from './types/bindings'
import { AppError } from './utils/app-error'
import { autoRegisterRealtime } from './core/realtime-scanner'
import { corsMiddleware, loggerMiddleware, errorHandlerMiddleware } from './middleware'
import { realtimeEnvMiddleware } from './middleware/realtime-env'
import { captchaMiddleware } from './middleware/captcha'
import { auditLogMiddleware } from './middleware/audit-log'
import { createModuleLoggerSync } from './utils/logger'
import { adminApiRoutes, clientApiRoutes } from './route-registry'
import { fileRoutes } from './module-file/routes/file-routes'

export { type AppBindings, type CreateAppOptions } from './types/bindings'

export function createApp<T extends AppBindings = AppBindings>(_options: CreateAppOptions = {}) {
  const app = new OpenAPIHono<{ Bindings: T }>()
    .use('*', errorHandlerMiddleware())
    .use('*', loggerMiddleware())
    .use('*', corsMiddleware())
    .use('*', realtimeEnvMiddleware())
    .use('/api/*', auditLogMiddleware())
    .use(
      '/api/admin/*',
      captchaMiddleware({
        maxRequests: 20,
        windowMs: 60000,
      })
    )
    .route('/', clientApiRoutes)
    .route('/', adminApiRoutes)
    .route('/files', fileRoutes)
    .get('/health', async c => {
      try {
        const { getDb } = await import('./db')
        await getDb()
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' })
      } catch {
        return c.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'not configured' })
      }
    })
    .post('/api/__test__/cleanup', async c => {
      try {
        const { cleanupTestDatabase } = await import('./db/test-setup')
        await cleanupTestDatabase()
        return c.json({ success: true as const, message: 'Database cleaned up' })
      } catch (error) {
        console.error('Error during database cleanup:', error)
        return c.json({ success: false as const, message: 'Failed to cleanup database' }, 500)
      }
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoRegisterRealtime(app as any)

  // Last-resort error handler for framework-level errors (e.g. 404 Not Found).
  // The canonical error handler is errorHandlerMiddleware (middleware/error-handler.ts).
  app.onError((err, c) => {
    const log = createModuleLoggerSync('api')
    c.res.headers.set('Content-Type', 'application/json')

    if (AppError.isAppError(err)) {
      return c.json(
        { success: false as const, error: err.message, status: err.statusCode, details: err.details },
        err.statusCode as ContentfulStatusCode
      )
    }

    if (err instanceof HTTPException) {
      return c.json({ success: false as const, error: err.message, status: err.status }, err.status as ContentfulStatusCode)
    }

    if (err instanceof ZodError) {
      const details = err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return c.json({ success: false as const, error: 'Validation failed', status: 400, details }, 400)
    }

    log.error({ err, path: c.req.path }, 'Unhandled error')
    return c.json(
      { success: false as const, error: err.message || 'Internal server error', status: 500 },
      500
    )
  })

  return app
}
export type AdminApiType = typeof adminApiRoutes
export type ClientApiType = typeof clientApiRoutes
export type AppType = ReturnType<typeof createApp>
