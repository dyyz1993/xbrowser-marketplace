import { describe, it, expect, beforeAll } from 'vitest'
import { autoRegisterRealtime } from '../realtime-scanner'
import { setRuntimeAdapter } from '../runtime'
import { NodeRuntimeAdapter } from '../runtime-node'
import { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'

describe('autoRegisterRealtime', () => {
  let adapter: NodeRuntimeAdapter

  beforeAll(() => {
    globalThis.__runtimeAdapter = undefined
    adapter = new NodeRuntimeAdapter()
    setRuntimeAdapter(adapter)
  })

  it('should register WebSocket routes', () => {
    const wsRoute = createRoute({
      method: 'get',
      path: '/chat/ws-test',
      responses: {
        200: {
          content: { websocket: { schema: z.any() } },
          description: 'WebSocket',
        },
      },
    })

    const app = new OpenAPIHono().openapi(wsRoute, async c => c.json({}))
    autoRegisterRealtime(app)

    expect(adapter.hasWSPath('/chat/ws-test')).toBe(true)
  })

  it('should register SSE routes', () => {
    const sseRoute = createRoute({
      method: 'get',
      path: '/notifications/stream-test',
      responses: {
        200: {
          content: { 'text/event-stream': { schema: z.any() } },
          description: 'SSE',
        },
      },
    })

    const app = new OpenAPIHono().openapi(sseRoute, async c => c.json({}))
    autoRegisterRealtime(app)

    expect(adapter.hasSSEPath('/notifications/stream-test')).toBe(true)
  })

  it('should register both WS and SSE routes', () => {
    const wsRoute = createRoute({
      method: 'get',
      path: '/chat/ws-both',
      responses: {
        200: { content: { websocket: { schema: z.any() } }, description: 'WS' },
      },
    })
    const sseRoute = createRoute({
      method: 'get',
      path: '/notifications/stream-both',
      responses: {
        200: { content: { 'text/event-stream': { schema: z.any() } }, description: 'SSE' },
      },
    })

    const app = new OpenAPIHono()
      .openapi(wsRoute, async c => c.json({}))
      .openapi(sseRoute, async c => c.json({}))

    autoRegisterRealtime(app)

    expect(adapter.hasWSPath('/chat/ws-both')).toBe(true)
    expect(adapter.hasSSEPath('/notifications/stream-both')).toBe(true)
  })

  it('should skip routes without websocket or SSE content types', () => {
    const jsonRoute = createRoute({
      method: 'get',
      path: '/api/todos-json',
      responses: {
        200: {
          content: { 'application/json': { schema: z.array(z.object({ id: z.number() })) } },
          description: 'JSON',
        },
      },
    })

    const app = new OpenAPIHono().openapi(jsonRoute, async c => c.json([]))
    autoRegisterRealtime(app)

    expect(adapter.hasWSPath('/api/todos-json')).toBe(false)
    expect(adapter.hasSSEPath('/api/todos-json')).toBe(false)
  })

  it('should handle empty app (no routes)', () => {
    const app = new OpenAPIHono()
    expect(() => autoRegisterRealtime(app)).not.toThrow()
  })

  it('should do nothing when getRuntimeAdapter throws', () => {
    const savedGlobal = globalThis.__runtimeAdapter
    const app = new OpenAPIHono()
    globalThis.__runtimeAdapter = undefined

    expect(() => autoRegisterRealtime(app)).not.toThrow()

    globalThis.__runtimeAdapter = savedGlobal
  })
})
