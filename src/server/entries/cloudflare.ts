/**
 * @framework-baseline bd1f09a9821e5162
 * @framework-modify
 * @reason 统一错误响应格式为 JSON，确保所有错误都返回结构化数据；移除冗余的 globalThis 设置
 * @impact 影响 Cloudflare Workers 环境的错误响应格式
 *
 * Note: In Cloudflare Workers, each request runs in its own isolate,
 * so globalThis is request-scoped and there's no race condition risk.
 * The middleware sets the DB binding for each request.
 */

import { createApp } from '../app'
import type { AppBindings } from '../types/bindings'
import { getDb } from '../db/driver-cloudflare'
import { RealtimeDurableObject } from '@server/core'
import { setRuntimeAdapter } from '@server/core/runtime'
import { getCloudflareRuntimeAdapter } from '@server/core/runtime-cloudflare'

export interface CloudflareBindings extends AppBindings {
  DB: D1Database
  REALTIME_DO: DurableObjectNamespace
  R2_BUCKET: R2Bucket
  AUTH_SECRET_KEY?: string
}

const runtimeAdapter = getCloudflareRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

const app = createApp<CloudflareBindings>()

const wrappedApp = app
  .use('*', async (c, next) => {
    ;(globalThis as unknown as { DB: D1Database }).DB = c.env.DB
    ;(globalThis as unknown as { R2_BUCKET: R2Bucket }).R2_BUCKET = c.env.R2_BUCKET
    if (c.env.AUTH_SECRET_KEY) {
      process.env.AUTH_SECRET_KEY = c.env.AUTH_SECRET_KEY
    }
    if (c.env.ENVIRONMENT) {
      ;(process.env as Record<string, string>).NODE_ENV = c.env.ENVIRONMENT
    }
    await next()
  })
  .onError((err, c) => {
    console.error('Server error:', err)
    c.res.headers.set('Content-Type', 'application/json')
    const statusCode =
      err instanceof Error && 'status' in err ? (err as { status: number }).status : 500
    const message = err.message || 'Internal server error'
    const responseStatus = statusCode || 500
    return c.json(
      { success: false as const, error: message, status: responseStatus },
      responseStatus as 500
    )
  })

export default {
  fetch: async (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => {
    ;(globalThis as unknown as { DB: D1Database }).DB = env.DB
    ;(globalThis as unknown as { R2_BUCKET: R2Bucket }).R2_BUCKET = (
      env as unknown as Record<string, unknown>
    ).R2_BUCKET as R2Bucket
    if (env.AUTH_SECRET_KEY) {
      process.env.AUTH_SECRET_KEY = env.AUTH_SECRET_KEY
    }
    if (env.ENVIRONMENT) {
      ;(process.env as Record<string, string>).NODE_ENV = env.ENVIRONMENT
    }

    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      return addSecurityHeaders(wrappedApp.fetch(request, env, ctx), url)
    }

    if (url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml') {
      return addSecurityHeaders(wrappedApp.fetch(request, env, ctx), url)
    }

    const staticPaths = ['/', '/categories', '/cli']
    const isStaticPage =
      staticPaths.includes(url.pathname) || staticPaths.includes(url.pathname.replace(/\/$/, ''))
    const pluginMatch = url.pathname.match(/^\/plugin\/([^/]+)\/?$/)
    const isPluginPage = pluginMatch !== null

    if (env.ASSETS) {
      // For SSG pages, try fetching the concrete HTML file directly.
      // With not_found_handling = "single-page-application", env.ASSETS.fetch()
      // returns 200 with the SPA shell even for missing files, so we must
      // check for an SSG marker (data-ssg attribute) to confirm.
      if (isPluginPage && pluginMatch) {
        const ssgUrl = new URL(`/plugin/${pluginMatch[1]}/index.html`, request.url)
        const ssgResponse = await env.ASSETS.fetch(new Request(ssgUrl))
        if (ssgResponse.ok) {
          const html = await ssgResponse.text()
          if (html.includes('data-ssg="true"')) {
            return addSecurityHeaders(Promise.resolve(new Response(html, ssgResponse)), url)
          }
        }
      }

      if (isStaticPage) {
        const pageName = url.pathname.replace(/\/$/, '') || '/index'
        const ssgPath = pageName === '/' ? '/index.html' : `${pageName}/index.html`
        const ssgUrl = new URL(ssgPath, request.url)
        const ssgResponse = await env.ASSETS.fetch(new Request(ssgUrl))
        if (ssgResponse.ok) {
          const html = await ssgResponse.text()
          if (html.includes('data-ssg="true"')) {
            return addSecurityHeaders(Promise.resolve(new Response(html, ssgResponse)), url)
          }
        }
      }
    }

    const noindexPaths = ['/login', '/register', '/search', '/notifications', '/admin']
    const needsNoindex = noindexPaths.some(p => url.pathname.startsWith(p))

    const isSpaRoute =
      isStaticPage ||
      isPluginPage ||
      /^\/plugin\//.test(url.pathname) ||
      !url.pathname.match(/\.[a-zA-Z0-9]{1,10}$/)

    if (env.ASSETS) {
      if (needsNoindex) {
        const spaResponse = await env.ASSETS.fetch(
          new Request(new URL('/index.spa.html', request.url))
        )
        if (spaResponse.ok) {
          const html = await spaResponse.text()
          const injected = html.replace(
            '</head>',
            '<meta name="robots" content="noindex, nofollow"></head>'
          )
          const resp = new Response(injected, {
            status: spaResponse.status,
            headers: spaResponse.headers,
          })
          return addSecurityHeaders(Promise.resolve(resp), url)
        }
      }

      if (!isSpaRoute) {
        const assetResponse = await env.ASSETS.fetch(request)
        if (assetResponse.status !== 404) {
          return addSecurityHeaders(Promise.resolve(assetResponse), url)
        }
      }

      const spaResponse = await env.ASSETS.fetch(
        new Request(new URL('/index.spa.html', request.url))
      )
      if (spaResponse.ok) {
        return addSecurityHeaders(Promise.resolve(spaResponse), url)
      }
    }

    return addSecurityHeaders(wrappedApp.fetch(request, env, ctx), url)
  },
}

function addSecurityHeaders(
  responseOrPromise: Response | Promise<Response>,
  url: URL
): Promise<Response> {
  return Promise.resolve(responseOrPromise).then(response => {
    const isApi = url.pathname.startsWith('/api/')
    if (isApi) return response

    const headers = new Headers(response.headers)

    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    if (url.protocol === 'https:' || url.hostname.endsWith('.workers.dev')) {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    const isAsset = url.pathname.startsWith('/assets/') || url.pathname.match(/\.[a-f0-9]{8,}\./)
    if (isAsset) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })
}

export { RealtimeDurableObject, getDb }
export type AppType = typeof wrappedApp
