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
  // eslint-disable-next-line local-rules/require-hono-chain-syntax -- app instance needs separate setup for middleware + routes
  const openapiApp = new OpenAPIHono<{ Bindings: T }>()
  const app = openapiApp
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
    .post('/api/__test__/seed', async c => {
      try {
        const { setupTestDatabase } = await import('./db/test-setup')
        await setupTestDatabase()
        return c.json({ success: true as const, message: 'Database seeded' })
      } catch (error) {
        console.error('Error during database seeding:', error)
        return c.json({ success: false as const, message: 'Failed to seed database' }, 500)
      }
    })
    .post('/api/__test__/seed-plugin', async c => {
      try {
        const { getDb } = await import('./db')
        const { plugins, pluginCategories, pluginCategoryMappings } = await import('./db/schema')
        const { generateUUID } = await import('./utils/uuid')
        const db = await getDb()
        const body = await c.req.json<{
          name?: string
          slug?: string
          category?: string
          description?: string
          status?: string
          featured?: boolean
        }>()
        const name = body.name || `Plugin ${Date.now()}`
        const slug =
          body.slug ||
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        const status = (body.status || 'approved') as 'pending' | 'approved' | 'rejected'
        const description = body.description || `Description for ${name}`
        const id = generateUUID()
        const now = new Date()
        await db.insert(plugins).values({
          id,
          name,
          slug,
          description,
          authorId: 'test-author',
          authorName: 'Test Author',
          version: '1.0.0',
          status,
          downloadCount: Math.floor(Math.random() * 100),
          viewCount: Math.floor(Math.random() * 200),
          featured: body.featured ?? false,
          tags: '["general"]',
          createdAt: now,
          updatedAt: now,
        })
        if (body.category) {
          let catRows = await db
            .select()
            .from(pluginCategories)
            .where(
              await import('drizzle-orm').then(m => m.eq(pluginCategories.slug, body.category!))
            )
          if (catRows.length === 0) {
            const catId = generateUUID()
            await db.insert(pluginCategories).values({
              id: catId,
              name: body.category,
              slug: body.category,
            })
            catRows = [{ id: catId } as (typeof catRows)[0]]
          }
          if (catRows[0]) {
            await db.insert(pluginCategoryMappings).values({
              pluginId: id,
              categoryId: catRows[0].id,
            })
          }
        }
        return c.json({ success: true as const, data: { id, name, slug, status } })
      } catch (error) {
        console.error('Error seeding plugin:', error)
        return c.json({ success: false as const, message: String(error) }, 500)
      }
    })
    .post('/api/__test__/seed-role', async c => {
      try {
        const { getDb } = await import('./db')
        const { roles, rolePermissions, permissions } = await import('./db/schema')
        const { generateUUID } = await import('./utils/uuid')
        const db = await getDb()
        const body = await c.req.json<{
          name?: string
          code?: string
          permissions?: string[]
        }>()
        const name = body.name || 'Test Role'
        const code = body.code || name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        const id = generateUUID()
        const now = new Date()
        await db.insert(roles).values({
          id,
          code,
          name,
          label: name,
          isSystem: false,
          isActive: true,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })
        if (body.permissions && body.permissions.length > 0) {
          const { inArray } = await import('drizzle-orm')
          const permRows = await db
            .select()
            .from(permissions)
            .where(inArray(permissions.code, body.permissions))
          for (const perm of permRows) {
            await db.insert(rolePermissions).values({
              roleId: id,
              permissionId: perm.id,
              createdAt: now,
            })
          }
        }
        return c.json({ success: true as const, data: { id, name, code } })
      } catch (error) {
        console.error('Error seeding role:', error)
        return c.json({ success: false as const, message: String(error) }, 500)
      }
    })
    .post('/api/__test__/seed-user', async c => {
      try {
        const { getDb } = await import('./db')
        const { developers } = await import('./db/schema')
        const { generateUUID } = await import('./utils/uuid')
        const { hashSync } = await import('bcryptjs')
        const db = await getDb()
        const body = await c.req.json<{
          username?: string
          email?: string
          password?: string
          role?: string
          apiKey?: string
        }>()
        const username = body.username || `user_${Date.now()}`
        const email = body.email || `${username}@test.com`
        const password = body.password || 'TestPass123!'
        const role = body.role || 'developer'
        const id = generateUUID()
        const now = new Date()
        await db.insert(developers).values({
          id,
          username,
          email,
          passwordHash: hashSync(password, 10),
          role,
          apiKey: body.apiKey || generateUUID(),
          createdAt: now,
          updatedAt: now,
        })
        return c.json({
          success: true as const,
          data: { id, username, email, role },
        })
      } catch (error) {
        console.error('Error seeding user:', error)
        return c.json({ success: false as const, message: String(error) }, 500)
      }
    })
    .post('/api/__test__/seed-file', async c => {
      try {
        const { generateUUID } = await import('./utils/uuid')
        const body = await c.req.json<{
          name?: string
          size?: number
          mimeType?: string
          content?: string
          isPrivate?: boolean
        }>()
        const name = body.name || 'test-file.txt'
        const size = body.size || 256
        const mimeType = body.mimeType || 'text/plain'
        const id = generateUUID()
        const secretKey = (await import('./config')).getConfig().fileStorage.secretKey
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secretKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(id))
        const signedUrl = Array.from(new Uint8Array(sig))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        return c.json({
          success: true as const,
          data: {
            id,
            name,
            size,
            mimeType,
            signedUrl,
            isPrivate: body.isPrivate ?? false,
          },
        })
      } catch (error) {
        console.error('Error seeding file:', error)
        return c.json({ success: false as const, message: String(error) }, 500)
      }
    })

  autoRegisterRealtime(openapiApp)

  app
    .get('/admin/*', async c => {
      const assets = (c.env as AppBindings).ASSETS
      if (!assets) return c.notFound()
      const response = await assets.fetch(new Request(new URL('/admin.html', c.req.url)))
      if (response.ok) return response
      return c.notFound()
    })
    .get('*', async c => {
      const assets = (c.env as AppBindings).ASSETS
      if (!assets) return c.notFound()
      const response = await assets.fetch(new Request(new URL('/index.html', c.req.url)))
      if (response.ok) return response
      return c.notFound()
    })

  // Last-resort error handler for framework-level errors (e.g. 404 Not Found).
  // The canonical error handler is errorHandlerMiddleware (middleware/error-handler.ts).
  app.onError((err, c) => {
    const log = createModuleLoggerSync('api')
    c.res.headers.set('Content-Type', 'application/json')

    if (AppError.isAppError(err)) {
      return c.json(
        {
          success: false as const,
          error: err.message,
          status: err.statusCode,
          details: err.details,
        },
        err.statusCode as ContentfulStatusCode
      )
    }

    if (err instanceof HTTPException) {
      return c.json(
        { success: false as const, error: err.message, status: err.status },
        err.status as ContentfulStatusCode
      )
    }

    if (err instanceof ZodError) {
      const details = err.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      return c.json(
        { success: false as const, error: 'Validation failed', status: 400, details },
        400
      )
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
