/**
 * @framework-baseline a1b2c3d4e5f6g7h8
 * @framework-modify
 * @reason 新增 API 请求包装器，提供链式调用的增强功能（loading、重试、错误处理）
 * @impact 所有使用 api() 函数的 API 调用都会受到影响，提供统一的请求处理能力
 *
 * API 请求包装器
 *
 * 提供链式调用的 API 请求增强功能：
 * - withLoading(): 显示 loading 状态
 * - withRetry(): 自动重试
 * - silentError(): 静默错误
 * - json(): 解析响应并自动处理错误
 */

import type { ApiSuccess, ApiError as ApiErrorType } from './api-schemas'

export interface ApiRequestOptions {
  loading?: boolean | string
  retry?: number
  retryDelay?: number
  silentError?: boolean
}

export class ApiRequestError extends Error {
  readonly code?: string
  readonly status?: number
  readonly details?: Array<{ field?: string; message: string; code?: string }>
  readonly timestamp?: string

  constructor(error: ApiErrorType) {
    super(error.error)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = error.status
    this.details = error.details
    this.timestamp = error.timestamp
  }
}

type LoadingStore = {
  startLoading: (text?: string) => void
  stopLoading: () => void
}

type MessageApi = {
  error: (msg: string) => void
}

let loadingStore: LoadingStore | null = null
let messageApi: MessageApi | null = null

export function setupApiRequestDeps(deps: { loadingStore: LoadingStore; messageApi: MessageApi }) {
  loadingStore = deps.loadingStore
  messageApi = deps.messageApi
}

interface HonoClientResponse<T> {
  ok: boolean
  status: number
  statusText: string
  json(): Promise<T>
}

export class ApiRequest<T> {
  private options: ApiRequestOptions = {}
  private requestPromise: Promise<HonoClientResponse<ApiSuccess<T> | ApiErrorType>>

  constructor(promise: Promise<HonoClientResponse<ApiSuccess<T> | ApiErrorType>>) {
    this.requestPromise = promise
  }

  withLoading(text?: boolean | string): this {
    this.options.loading = text === undefined ? true : text
    return this
  }

  withRetry(count: number, delay = 1000): this {
    this.options.retry = count
    this.options.retryDelay = delay
    return this
  }

  silentError(): this {
    this.options.silentError = true
    return this
  }

  async json(): Promise<T> {
    const { loading, retry = 0, retryDelay = 1000, silentError } = this.options

    if (loading !== undefined && loading !== false && loadingStore) {
      const text = typeof loading === 'string' ? loading : undefined
      loadingStore.startLoading(text)
    }

    let lastError: Error | null = null
    let attempts = 0

    while (attempts <= retry) {
      try {
        const response = await this.requestPromise

        if (!response.ok) {
          const errorData = await this.tryParseError(response)
          throw new ApiRequestError(errorData)
        }

        const result = await response.json()

        if (result.success) {
          if (loading !== undefined && loading !== false && loadingStore) {
            loadingStore.stopLoading()
          }
          return result.data
        }

        throw new ApiRequestError(result)
      } catch (error) {
        lastError = error as Error
        attempts++

        if (attempts <= retry && this.shouldRetry(error)) {
          await this.delay(retryDelay)
          continue
        }

        break
      }
    }

    if (loading !== undefined && loading !== false && loadingStore) {
      loadingStore.stopLoading()
    }

    const error = lastError!

    if (!silentError) {
      if (error instanceof ApiRequestError) {
        messageApi?.error(error.message)
      } else {
        messageApi?.error('请求失败，请稍后重试')
      }
    }

    throw error
  }

  private async tryParseError(response: HonoClientResponse<unknown>): Promise<ApiErrorType> {
    try {
      const data = (await response.json()) as unknown
      if (data && typeof data === 'object' && 'error' in data) {
        return data as ApiErrorType
      }
    } catch {
      // ignore
    }
    return {
      success: false,
      error: `HTTP Error: ${response.status} ${response.statusText}`,
      status: response.status,
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof ApiRequestError) {
      const status = error.status
      if (status === 401 || status === 403 || status === 404 || status === 422) {
        return false
      }
      return true
    }
    return error instanceof TypeError
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

type ExtractJsonType<T> = T extends { json(): Promise<infer J> } ? J : never
type ExtractData<T> = T extends ApiSuccess<infer D> ? D : never

export function api<T extends { json(): Promise<unknown> }>(
  promise: Promise<T>
): ApiRequest<ExtractData<ExtractJsonType<T>>> {
  return new ApiRequest<ExtractData<ExtractJsonType<T>>>(
    promise as unknown as Promise<
      HonoClientResponse<ApiSuccess<ExtractData<ExtractJsonType<T>>> | ApiErrorType>
    >
  )
}
