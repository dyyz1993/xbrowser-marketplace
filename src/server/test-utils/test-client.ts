/**
 * @framework-baseline d16be4b1b9aefd60
 *
 * @framework-modify
 * @reason 添加 headers 参数支持，以便在测试中传递认证头
 * @impact 测试客户端现在支持自定义 headers，用于认证测试
 */

import { hc } from 'hono/client'
import { createApp } from '@server/app'
import { SSEClientImpl } from '@shared/core/sse-client'
import { extendHonoClient, type ExtendedClientOptions } from '@shared/core/hono-client-types'

/**
 * 测试客户端类型
 *
 * 注意：使用 any 避免深度的类型推导问题 (TS2589)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TestClient = any

export interface TestClientOptions {
  webSocket?: (url: string | URL) => WebSocket
  sse?: (url: string | URL) => unknown
  headers?: Record<string, string>
}

/**
 * 创建测试客户端
 */
export function createTestClient(baseUrl?: string, options?: TestClientOptions): TestClient {
  const app = createApp()
  const defaultHeaders = {
    'User-Agent': 'TestClient/1.0 (Unit Test)',
    ...options?.headers,
  }

  const sseFactory = options?.sse
    ? (url: string | URL) => options.sse!(url)
    : (url: string | URL) => new SSEClientImpl(url, defaultHeaders)

  if (baseUrl) {
    const baseClient = hc(baseUrl, {
      headers: defaultHeaders,
      webSocket: options?.webSocket ? (url: string | URL) => options.webSocket!(url) : undefined,
      sse: sseFactory as (url: string) => unknown,
    } as ExtendedClientOptions) as unknown as TestClient
    return extendHonoClient(baseClient) as TestClient
  }
  const baseClient = hc('http://localhost', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: (input: any, init?: any) => {
      const request = new Request(input, init)
      Object.entries(defaultHeaders).forEach(([key, value]) => {
        if (!request.headers.has(key)) {
          request.headers.set(key, value)
        }
      })
      return app.fetch(request)
    },
    sse: sseFactory as (url: string) => unknown,
  } as ExtendedClientOptions) as unknown as TestClient
  return extendHonoClient(baseClient) as TestClient
}
