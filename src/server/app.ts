import { OpenAPIHono } from '@hono/zod-openapi'

import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { ZodError } from 'zod'
import React from 'react'
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
import {
  renderToHTML,
  buildDocument,
  PluginDetailSSR,
  HomeSSR,
  CategoriesSSR,
  CliSSR,
  type PluginSSRData,
} from './ssr'

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
    .post('/api/__test__/seed-review', async c => {
      try {
        const { getDb } = await import('./db')
        const { plugins, pluginReviews } = await import('./db/schema')
        const { generateUUID } = await import('./utils/uuid')
        const db = await getDb()
        const body = await c.req.json<{
          pluginSlug?: string
          rating?: number
          title?: string
          content?: string
          userName?: string
        }>()
        const pluginSlug = body.pluginSlug
        if (!pluginSlug) {
          return c.json({ success: false as const, message: 'pluginSlug is required' }, 400)
        }
        const { eq } = await import('drizzle-orm')
        const pluginRows = await db
          .select()
          .from(plugins)
          .where(eq(plugins.slug, pluginSlug))
          .limit(1)
        if (pluginRows.length === 0) {
          return c.json({ success: false as const, message: 'Plugin not found' }, 404)
        }
        const id = generateUUID()
        const now = new Date()
        await db.insert(pluginReviews).values({
          id,
          pluginId: pluginRows[0].id,
          userId: 'test-reviewer',
          userName: body.userName || 'Test Reviewer',
          rating: body.rating ?? 5,
          title: body.title ?? null,
          content: body.content ?? 'Great plugin!',
          createdAt: now,
        })
        return c.json({
          success: true as const,
          data: { id, pluginId: pluginRows[0].id, rating: body.rating ?? 5 },
        })
      } catch (error) {
        console.error('Error seeding review:', error)
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

  const SEO_BASE_URL = 'https://xbrowser-marketplace.dyyz1993.workers.dev'
  const SEO_SITE_NAME = 'xbrowser Plugin Marketplace'

  function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str
    return str.slice(0, maxLen - 3) + '...'
  }

  app
    .get('/robots.txt', c => {
      const body = `User-agent: *
Allow: /
Allow: /plugin/
Disallow: /api/
Disallow: /admin/

Sitemap: ${SEO_BASE_URL}/sitemap.xml
`
      return c.text(body, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
    })
    .get('/plugins', async c => {
      return c.redirect('/', 301)
    })
    .get('/sitemap.xml', async c => {
      try {
        const { getDb } = await import('./db')
        const { plugins } = await import('./db/schema')
        const { eq } = await import('drizzle-orm')
        const db = await getDb()
        const approved = await db.select().from(plugins).where(eq(plugins.status, 'approved'))
        const now = new Date().toISOString().split('T')[0]
        const urls = [
          { loc: SEO_BASE_URL, lastmod: now, changefreq: 'daily', priority: '1.0' },
          {
            loc: `${SEO_BASE_URL}/categories`,
            lastmod: now,
            changefreq: 'weekly',
            priority: '0.9',
          },
          { loc: `${SEO_BASE_URL}/cli`, lastmod: now, changefreq: 'monthly', priority: '0.7' },
          ...approved.map(p => {
            let date: Date
            if (p.updatedAt instanceof Date) {
              date =
                p.updatedAt.getTime() < 1e12 ? new Date(p.updatedAt.getTime() * 1000) : p.updatedAt
            } else {
              const raw = Number(p.updatedAt)
              date = new Date(raw > 1e12 ? raw : raw * 1000)
            }
            return {
              loc: `${SEO_BASE_URL}/plugin/${p.slug}`,
              lastmod: date.toISOString().split('T')[0],
              changefreq: 'weekly',
              priority: '0.8',
            }
          }),
        ]
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`
        return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
      } catch {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SEO_BASE_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
        return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
      }
    })
    .get('/plugin/:slug', async c => {
      const slug = c.req.param('slug')

      try {
        const { getDb } = await import('./db')
        const { plugins } = await import('./db/schema')
        const { eq } = await import('drizzle-orm')
        const db = await getDb()
        const rows = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

        if (rows.length === 0) return c.notFound()

        const p = rows[0]

        let avgRating = 0
        let reviewCount = 0
        try {
          const { getReviewStatsForPlugin } =
            await import('./module-plugin/services/plugin-review-service')
          const stats = await getReviewStatsForPlugin(p.id)
          if (stats.reviewCount > 0) {
            avgRating = stats.avgRating
            reviewCount = stats.reviewCount
          }
        } catch {
          // Review stats are optional
        }

        const pluginData: PluginSSRData = {
          slug: p.slug,
          name: p.name,
          description: p.description,
          avgRating,
          reviewCount,
          downloads: p.downloadCount ?? 0,
          author: p.authorName ?? 'Unknown',
          category: 'other',
          version: p.version ?? '1.0.0',
        }

        const content = renderToHTML(React.createElement(PluginDetailSSR, { plugin: pluginData }))

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: p.name,
          description: p.description,
          applicationCategory: 'BrowserExtension',
          operatingSystem: 'Any',
          version: p.version,
          author: { '@type': 'Person', name: p.authorName },
          url: `${SEO_BASE_URL}/plugin/${p.slug}`,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          ...(avgRating
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: avgRating,
                  reviewCount,
                },
              }
            : {}),
        }

        let spaTemplate: string | undefined
        const assets = (c.env as AppBindings).ASSETS
        if (assets) {
          try {
            const spaResponse = await assets.fetch(new Request(new URL('/index.html', c.req.url)))
            if (spaResponse.ok) {
              spaTemplate = await spaResponse.text()
            }
          } catch {
            // Template fetch failed, fall back to no-template mode
          }
        }

        const html = buildDocument({
          title: `${p.name} - ${SEO_SITE_NAME}`,
          description: truncate(p.description, 160),
          content,
          spaTemplate,
          canonicalPath: `/plugin/${p.slug}`,
          extraHead: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>${
            p.screenshotUrl
              ? `<meta property="og:image" content="${p.screenshotUrl}" /><meta name="twitter:image" content="${p.screenshotUrl}" />`
              : ''
          }`,
        })

        return c.html(html)
      } catch {
        const assets = (c.env as AppBindings).ASSETS
        if (!assets) return c.notFound()
        return assets.fetch(new Request(new URL('/index.html', c.req.url)))
      }
    })
    .get('/admin/*', async c => {
      const assets = (c.env as AppBindings).ASSETS
      if (!assets) return c.notFound()
      const response = await assets.fetch(new Request(new URL('/admin.html', c.req.url)))
      if (response.ok) return response
      return c.notFound()
    })
    .get('/', async c => {
      try {
        const { getDb } = await import('./db')
        const { plugins, pluginCategories, pluginCategoryMappings } = await import('./db/schema')
        const { eq, desc, inArray } = await import('drizzle-orm')
        const db = await getDb()

        const approvedPlugins = await db
          .select()
          .from(plugins)
          .where(eq(plugins.status, 'approved'))
          .orderBy(desc(plugins.createdAt))
          .limit(12)

        const allApproved = await db.select().from(plugins).where(eq(plugins.status, 'approved'))
        const totalPlugins = allApproved.length

        const catRows = await db.select().from(pluginCategories)

        const pluginIds = approvedPlugins.map(p => p.id)
        let ratingMap = new Map<string, { avgRating: number; reviewCount: number }>()
        if (pluginIds.length > 0) {
          try {
            const { getReviewStatsBatch } =
              await import('./module-plugin/services/plugin-review-service')
            ratingMap = await getReviewStatsBatch(pluginIds)
          } catch {
            // Reviews are optional
          }
        }

        const mappings =
          pluginIds.length > 0
            ? await db
                .select()
                .from(pluginCategoryMappings)
                .where(inArray(pluginCategoryMappings.pluginId, pluginIds))
            : []
        const pluginCatMap = new Map<string, string>()
        for (const m of mappings) {
          if (!pluginCatMap.has(m.pluginId)) {
            const cat = catRows.find(c => c.id === m.categoryId)
            if (cat) pluginCatMap.set(m.pluginId, cat.slug)
          }
        }

        const pluginItems = approvedPlugins.map(p => {
          const stats = ratingMap.get(p.id)
          return {
            name: p.name,
            description: p.description,
            slug: p.slug,
            downloads: p.downloadCount ?? 0,
            avgRating: stats?.avgRating ?? 0,
            category: pluginCatMap.get(p.id) ?? 'other',
          }
        })

        const categories = catRows.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          count: 0,
        }))

        const content = renderToHTML(
          React.createElement(HomeSSR, {
            plugins: pluginItems,
            categories,
            totalPlugins,
          })
        )

        let spaTemplate: string | undefined
        const assets = (c.env as AppBindings).ASSETS
        if (assets) {
          try {
            const spaResponse = await assets.fetch(new Request(new URL('/index.html', c.req.url)))
            if (spaResponse.ok) {
              spaTemplate = await spaResponse.text()
            }
          } catch {
            // Template fetch failed
          }
        }

        const html = buildDocument({
          title: `XBrowser Marketplace - Browser Extensions & Plugins`,
          description: 'Discover and install browser extensions and plugins.',
          content,
          spaTemplate,
          canonicalPath: '/',
        })

        return c.html(html)
      } catch (err) {
        console.error('[SSR /] Error rendering homepage:', err)
        const assets = (c.env as AppBindings).ASSETS
        if (!assets) return c.notFound()
        return assets.fetch(new Request(new URL('/index.html', c.req.url)))
      }
    })
    .get('/categories', async c => {
      try {
        const { getDb } = await import('./db')
        const { plugins, pluginCategories, pluginCategoryMappings } = await import('./db/schema')
        const { eq } = await import('drizzle-orm')
        const db = await getDb()

        const catRows = await db.select().from(pluginCategories)

        const allApproved = await db.select().from(plugins).where(eq(plugins.status, 'approved'))
        const totalPlugins = allApproved.length

        const approvedIds = allApproved.map(p => p.id)
        const categoryCounts = new Map<string, number>()
        if (approvedIds.length > 0) {
          const { inArray } = await import('drizzle-orm')
          const mappings = await db
            .select()
            .from(pluginCategoryMappings)
            .where(inArray(pluginCategoryMappings.pluginId, approvedIds))
          for (const m of mappings) {
            categoryCounts.set(m.categoryId, (categoryCounts.get(m.categoryId) ?? 0) + 1)
          }
        }

        const categories = catRows.map(cat => ({
          name: cat.name,
          slug: cat.slug,
          description: cat.description ?? undefined,
          pluginCount: categoryCounts.get(cat.id) ?? 0,
        }))

        const content = renderToHTML(
          React.createElement(CategoriesSSR, { categories, totalPlugins })
        )

        let spaTemplate: string | undefined
        const assets = (c.env as AppBindings).ASSETS
        if (assets) {
          try {
            const spaResponse = await assets.fetch(new Request(new URL('/index.html', c.req.url)))
            if (spaResponse.ok) {
              spaTemplate = await spaResponse.text()
            }
          } catch {
            // Template fetch failed
          }
        }

        const html = buildDocument({
          title: `Browse Categories - ${SEO_SITE_NAME}`,
          description: 'Browse browser extension plugins by category.',
          content,
          spaTemplate,
          canonicalPath: '/categories',
        })

        return c.html(html)
      } catch (err) {
        console.error('[SSR /categories] Error:', err)
        const assets = (c.env as AppBindings).ASSETS
        if (!assets) return c.notFound()
        return assets.fetch(new Request(new URL('/index.html', c.req.url)))
      }
    })
    .get('/cli', async c => {
      try {
        const content = renderToHTML(React.createElement(CliSSR))

        let spaTemplate: string | undefined
        const assets = (c.env as AppBindings).ASSETS
        if (assets) {
          try {
            const spaResponse = await assets.fetch(new Request(new URL('/index.html', c.req.url)))
            if (spaResponse.ok) {
              spaTemplate = await spaResponse.text()
            }
          } catch {
            // Template fetch failed
          }
        }

        const html = buildDocument({
          title: `CLI Documentation - ${SEO_SITE_NAME}`,
          description:
            'Install and use xbrowser CLI to browse, install, and publish browser automation plugins.',
          content,
          spaTemplate,
          canonicalPath: '/cli',
        })

        return c.html(html)
      } catch (err) {
        console.error('[SSR /cli] Error:', err)
        const assets = (c.env as AppBindings).ASSETS
        if (!assets) return c.notFound()
        return assets.fetch(new Request(new URL('/index.html', c.req.url)))
      }
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
