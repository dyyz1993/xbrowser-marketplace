/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @framework-baseline ab16e97716a7556e
 * @framework-modify
 * @reason 简化拦截器，移除 loading 控制，由 api-request.ts 统一管理
 * @impact loading 控制现在通过 api().withLoading() 链式调用实现
 */

import { hc } from 'hono/client'
import { WSClientImpl } from '@shared/core/ws-client'
import { extendHonoClient } from '@shared/core/hono-client-types'
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

// @ts-expect-error Hono RPC type depth exceeds TypeScript limit with large API surface
const rawClient: any = hc<AdminApiType>(baseUrl, {
  fetch: createCustomFetch() as typeof fetch,
  webSocket: url => new WSClientImpl(url),
})

export const apiClient: any = extendHonoClient(rawClient)

export { api } from '@shared/core/api-request'
