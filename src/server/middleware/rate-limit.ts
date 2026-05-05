import type { Context, Next } from 'hono'

type RateLimitEntry = { count: number; resetAt: number }

const rateLimitStore = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 60_000)

export type RateLimitOptions = {
  windowMs?: number
  max?: number
  message?: string
}

export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 100
  const message = options.message ?? 'Too many requests'

  return async (c: Context, next: Next) => {
    if (process.env.NODE_ENV === 'test') {
      return next()
    }

    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'unknown'
    const now = Date.now()
    const entry = rateLimitStore.get(ip)

    if (entry && entry.resetAt > now && entry.count >= max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return c.json({ success: false as const, error: message }, 429)
    }

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
    }

    await next()
  }
}
