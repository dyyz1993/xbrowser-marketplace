/**
 * SSE route helpers
 *
 * Business layer utilities for creating SSE clients from Hono routes.
 * This is NOT a framework layer file.
 */

import type { SSEClient, SSEProtocol } from '@shared/core/sse-client'
import { createSSEClient } from '@shared/core/sse-client'

/**
 * Creates an SSE client from a Hono route object.
 *
 * This provides a type-safe way to create SSE connections from Hono routes.
 * Usage pattern from the SSE rules:
 * ```typescript
 * import { apiClient } from '@client/services/apiClient'
 * import { createSSEClientFromRoute } from '@shared/utils/sse-route-helpers'
 *
 * const conn = createSSEClientFromRoute(apiClient.api.notifications.stream)
 * ```
 *
 * Note: This function works because Hono routes expose a `$url()` method.
 *
 * @param route - Hono route object (e.g., apiClient.api.notifications.stream)
 * @returns SSE client instance
 */
export function createSSEClientFromRoute<P extends SSEProtocol = SSEProtocol>(
  route: { $url: () => URL }
): SSEClient<P> {
  const url = route.$url()
  return createSSEClient<P>(url, {})
}
