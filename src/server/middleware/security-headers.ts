import type { MiddlewareHandler } from 'hono'

export function securityHeadersMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next()

    const url = new URL(c.req.url)
    const isApi = url.pathname.startsWith('/api/')
    const isAsset = url.pathname.startsWith('/assets/') || url.pathname.includes('/assets/')

    if (isApi) return

    const headers = c.res.headers

    headers.set('X-Frame-Options', 'DENY')
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-XSS-Protection', '1; mode=block')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    if (url.protocol === 'https:' || url.hostname.endsWith('.workers.dev')) {
      headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    if (isAsset) {
      const cacheControl = headers.get('Cache-Control')
      if (!cacheControl) {
        headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      }
    }
  }
}

export function createSecurityHeadersMiddleware() {
  return securityHeadersMiddleware()
}
