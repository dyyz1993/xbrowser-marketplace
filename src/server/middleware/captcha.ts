import type { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { randomUUID } from 'crypto'

export interface CaptchaConfig {
  skipPaths?: string[]
  maxRequests?: number
  windowMs?: number
}

interface CaptchaSession {
  verified: boolean
  verifiedAt?: number
  requestCount: number
  windowStart: number
  createdAt: number
}

const MAX_SESSIONS = 1000
const SESSION_TTL = 5 * 60 * 1000

const captchaSessions = new Map<string, CaptchaSession>()

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [key, session] of captchaSessions) {
    if (now - session.createdAt > SESSION_TTL) {
      captchaSessions.delete(key)
    }
  }
  if (captchaSessions.size > MAX_SESSIONS) {
    const entries = [...captchaSessions.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
    const toDelete = entries.slice(0, captchaSessions.size - MAX_SESSIONS)
    for (const [key] of toDelete) captchaSessions.delete(key)
  }
}

export function captchaMiddleware(config: CaptchaConfig = {}) {
  const {
    skipPaths = ['/api/captcha', '/api/verify-captcha', '/api/admin/login', '/api/admin/register'],
    maxRequests = 10,
    windowMs = 60000,
  } = config

  return async (c: Context, next: Next) => {
    if (process.env.NODE_ENV === 'test') {
      return next()
    }

    cleanupExpiredSessions()

    const path = c.req.path

    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return next()
    }

    const sessionId = getCookie(c, 'session_id') || generateSessionId()

    if (!getCookie(c, 'session_id')) {
      setCookie(c, 'session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 86400,
      })
    }

    const now = Date.now()
    const session = captchaSessions.get(sessionId) || {
      verified: false,
      requestCount: 0,
      windowStart: now,
      createdAt: now,
    }

    if (now - session.windowStart > windowMs) {
      session.requestCount = 0
      session.windowStart = now
    }

    session.requestCount++
    captchaSessions.set(sessionId, session)

    if (session.verified && session.verifiedAt && now - session.verifiedAt < 300000) {
      return next()
    }

    if (session.requestCount > maxRequests) {
      return c.json(
        {
          success: false as const,
          error: '请求过于频繁，请完成验证码验证',
          needCaptcha: true,
        },
        429
      )
    }

    if (isSuspiciousRequest(c)) {
      return c.json(
        {
          success: false as const,
          error: '检测到可疑行为，请完成验证码验证',
          needCaptcha: true,
        },
        403
      )
    }

    return next()
  }
}

export function verifyCaptchaMiddleware() {
  return async (c: Context, next: Next) => {
    const sessionId = getCookie(c, 'session_id')

    if (!sessionId) {
      return c.json({ success: false as const, error: 'Session not found' }, 400)
    }

    const session = captchaSessions.get(sessionId)

    if (session) {
      session.verified = true
      session.verifiedAt = Date.now()
      captchaSessions.set(sessionId, session)
    }

    return next()
  }
}

function generateSessionId(): string {
  return randomUUID()
}

function isSuspiciousRequest(c: Context): boolean {
  const userAgent = c.req.header('User-Agent') || ''

  if (!userAgent || userAgent.length < 10) {
    return true
  }

  if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    return true
  }

  return false
}

export function markCaptchaVerifiedMiddleware(sessionId: string) {
  const session = captchaSessions.get(sessionId)
  if (session) {
    session.verified = true
    session.verifiedAt = Date.now()
    session.requestCount = 0
    session.windowStart = Date.now()
    captchaSessions.set(sessionId, session)
  }
}

export function clearCaptchaSessionMiddleware(sessionId: string) {
  captchaSessions.delete(sessionId)
}
