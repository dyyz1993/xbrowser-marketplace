/**
 * @framework-baseline ab16e97716a7556e
 * @framework-modify
 * @reason 简化拦截器，移除 loading 控制，由 api-request.ts 统一管理
 * @impact loading 控制现在通过 api().withLoading() 链式调用实现
 */

import { hc } from 'hono/client'
import { WSClientImpl } from '@shared/core/ws-client'
import { SSEClientImpl } from '@shared/core/sse-client'
import { createRequestInterceptor } from './requestInterceptor'
import { useCaptchaStore } from '../stores/captchaStore'
import type { AdminApiType } from '@server/index'

const baseUrl = import.meta.env.API_BASE_URL || window.location.origin

const TOKEN_KEY = 'admin-storage'

function clearAuthAndRedirect(): void {
  localStorage.removeItem(TOKEN_KEY)
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.token || null
    }
  } catch {
    return null
  }
  return null
}

function createCustomFetch() {
  const showCaptcha = useCaptchaStore.getState().show

  return createRequestInterceptor({
    onShowLogin: clearAuthAndRedirect,
    onShowCaptcha: async config => {
      return showCaptcha({
        type: config.type,
        captchaUrl: config.captchaUrl,
      })
    },
  })
}

export const apiClient = hc<AdminApiType>(baseUrl, {
  fetch: createCustomFetch() as typeof fetch,
  webSocket: url => new WSClientImpl(url),
  sse: url => {
    const token = getAuthToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return new SSEClientImpl(url, headers)
  },
})

export { api } from '@shared/core/api-request'
