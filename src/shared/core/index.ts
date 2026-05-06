/**
 * @framework-baseline 2e976477689dd2fe
 *
 * 此文件属于框架层代码。如需修改，请添加以下说明：
 *
 * @framework-modify
 * @reason [必填] 修改原因
 * @impact [必填] 影响范围
 */

// API Schemas
export {
  ApiSuccessSchema,
  ApiErrorSchema,
  ApiResponseSchema,
  type ApiSuccess,
  type ApiError,
  type ApiResponse,
} from './api-schemas'

// Protocol Types
export type { RpcMethod, EventName, RpcInput, RpcOutput, EventPayload } from './protocol-types'

// WS Client
export { WSClientImpl, createWSClient } from './ws-client'

// SSE Client
export { SSEClientImpl, createSSEClient } from './sse-client'

// Hono Client Utilities (minimal, for testing/CLI only)
export { extendHonoClient, type ExtendedClientOptions } from './hono-client-types'
