import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, setupApiRequestDeps, ApiRequestError } from '@shared/core/api-request'
import type { ApiSuccess, ApiError } from '@shared/core/api-schemas'

describe('api request functionality', () => {
  let loadingStore: {
    count: number
    isLoading: boolean
    loadingText?: string
    startLoading: ReturnType<typeof vi.fn>
    stopLoading: ReturnType<typeof vi.fn>
  }
  let messageApi: {
    error: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    loadingStore = {
      count: 0,
      isLoading: false,
      loadingText: undefined,
      startLoading: vi.fn((text?: string) => {
        loadingStore.count++
        loadingStore.isLoading = true
        loadingStore.loadingText = text
      }),
      stopLoading: vi.fn(() => {
        loadingStore.count = Math.max(0, loadingStore.count - 1)
        loadingStore.isLoading = loadingStore.count > 0
        if (loadingStore.count === 0) {
          loadingStore.loadingText = undefined
        }
      }),
    }

    messageApi = {
      error: vi.fn(),
    }

    setupApiRequestDeps({
      loadingStore: loadingStore as unknown as {
        startLoading: (text?: string) => void
        stopLoading: () => void
      },
      messageApi: messageApi as unknown as { error: (msg: string) => void },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockResponse = (
    data: ApiSuccess<unknown> | ApiError,
    status = 200
  ): Promise<{
    ok: boolean
    status: number
    statusText: string
    json: () => Promise<unknown>
  }> => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(data),
    })
  }

  it('should return data on successful response', async () => {
    const mockData = { id: '1', name: 'test' }
    const response = createMockResponse({
      success: true,
      data: mockData,
      timestamp: new Date().toISOString(),
    })

    const result = await api(response).json()

    expect(result).toEqual(mockData)
  })

  it('should trigger loading when withLoading() is called', async () => {
    const mockData = { id: '1' }
    const response = createMockResponse({
      success: true,
      data: mockData,
      timestamp: new Date().toISOString(),
    })

    await api(response).withLoading('加载中...').json()

    expect(loadingStore.startLoading).toHaveBeenCalledWith('加载中...')
    expect(loadingStore.stopLoading).toHaveBeenCalled()
  })

  it('should NOT trigger loading when withLoading is not called', async () => {
    const mockData = { id: '1' }
    const response = createMockResponse({
      success: true,
      data: mockData,
      timestamp: new Date().toISOString(),
    })

    await api(response).json()

    expect(loadingStore.startLoading).not.toHaveBeenCalled()
    expect(loadingStore.stopLoading).not.toHaveBeenCalled()
  })

  it('should show error message on failure', async () => {
    const errorResponse: ApiError = {
      success: false,
      error: 'Something went wrong',
      code: 'ERROR_CODE',
      status: 400,
    }
    const response = createMockResponse(errorResponse, 400)

    await expect(api(response).json()).rejects.toThrow(ApiRequestError)
    expect(messageApi.error).toHaveBeenCalledWith('Something went wrong')
  })

  it('should NOT show error message when silentError() is called', async () => {
    const errorResponse: ApiError = {
      success: false,
      error: 'Silent error',
      status: 500,
    }
    const response = createMockResponse(errorResponse, 500)

    await expect(api(response).silentError().json()).rejects.toThrow(ApiRequestError)
    expect(messageApi.error).not.toHaveBeenCalled()
  })

  it('should NOT retry on non-retryable errors (401, 403, 404, 422)', async () => {
    const errorResponse: ApiError = {
      success: false,
      error: 'Not found',
      status: 404,
    }
    const response = createMockResponse(errorResponse, 404)

    await expect(api(response).withRetry(3, 10).json()).rejects.toThrow(ApiRequestError)
  })
})
