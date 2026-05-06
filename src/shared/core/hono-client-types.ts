/**
 * @framework-baseline 094c92f4c1177d46
 *
 * @framework-modify
 * @reason 添加 ExtendedClientOptions 类型和 extendHonoClient 辅助函数，用于测试客户端扩展 WebSocket/SSE 能力
 * @impact 仅影响测试客户端类型推导，不影响业务逻辑
 */

/**
 * @framework-baseline new-file-minimal-extension
 *
 * Minimal Hono client type utilities for testing and CLI.
 *
 * This file provides a type-safe way to extend Hono client with custom factory options
 * (like webSocket for testing). It does NOT add SSE helpers - those use business layer utilities.
 */

import type { ClientRequestOptions } from 'hono/client'

export type ExtendedClientOptions = ClientRequestOptions & {
  /** WebSocket factory function (for testing) */
  webSocket?: (url: string | URL) => unknown
  /** SSE factory function (for testing) */
  sse?: (url: string | URL) => unknown
}

/**
 * Type identity function for Hono client.
 *
 * Preserves the exact type of the Hono client from hc() while allowing
 * custom factory options like webSocket for testing.
 *
 * @param client - The Hono client instance from hc()
 * @returns The same client with preserved type
 */
export function extendHonoClient<T>(client: T): T {
  return client
}
