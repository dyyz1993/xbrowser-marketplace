import { hc } from 'hono/client'
import type { ClientApiType, AppType } from '@server/index'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'
import { extendHonoClient, type ExtendedClientOptions } from '@shared/core/hono-client-types'

export type { AppType }

export interface CliFetchExtendOptions {
  verbose?: boolean
  timeout?: number
}

export function createRPCClient(baseUrl: string, token?: string) {
  return extendHonoClient(
    hc<ClientApiType>(baseUrl, {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return globalThis.fetch(input, { ...init, headers })
      },
      webSocket: url => new WSClientImpl(url),
      sse: url => new SSEClientImpl(url),
    } as ExtendedClientOptions)
  )
}
