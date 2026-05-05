/**
 * @framework-baseline e350401421193896
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
}

const runtimeAdapter = getCloudflareRuntimeAdapter()
setRuntimeAdapter(runtimeAdapter)

const app = createApp<CloudflareBindings>()

const wrappedApp = app
  .use('*', async (c, next) => {
    ;(globalThis as unknown as { DB: D1Database }).DB = c.env.DB
    await next()
  })
  .get('/', c =>
    c.json({
      name: 'Biomimic Todo App',
      version: '0.1.0',
      environment: 'cloudflare-workers',
    })
  )
  .onError((err, c) => {
    console.error('Server error:', err)
    c.res.headers.set('Content-Type', 'application/json')
    const statusCode =
      err instanceof Error && 'status' in err ? (err as { status: number }).status : 500
    const message = err.message || 'Internal server error'
    const responseStatus = statusCode || 500
    return c.json({ success: false as const, error: message, status: responseStatus }, responseStatus as 500)
  })

export default {
  fetch: async (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/') || url.pathname === '/health') {
      return wrappedApp.fetch(request, env, ctx)
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request)
      if (assetResponse.status !== 404) {
        return assetResponse
      }
    }

    return wrappedApp.fetch(request, env, ctx)
  },
}

export { RealtimeDurableObject, getDb }
export type AppType = typeof wrappedApp
