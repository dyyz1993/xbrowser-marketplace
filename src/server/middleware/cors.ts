import type { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { getConfig } from '../config'

export type CorsOptions = {
  origin?: string | string[]
  credentials?: boolean
  allowMethods?: string[]
  allowHeaders?: string[]
  exposeHeaders?: string[]
  maxAge?: number
}

function getDefaultCorsOptions(): Required<Omit<CorsOptions, 'exposeHeaders' | 'maxAge'>> &
  CorsOptions {
  return {
    origin: getConfig().corsOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }
}

export function corsMiddleware(options: CorsOptions = {}): MiddlewareHandler {
  const mergedOptions = { ...getDefaultCorsOptions(), ...options }

  return cors(mergedOptions as never)
}

export function createCorsMiddleware(options: CorsOptions = {}) {
  return corsMiddleware(options)
}
