/**
 * @framework-baseline a1b2c3d4e5f67890
 * @framework-modify
 * @reason 重构以使用 Hono RPC 客户端替代原生 fetch，实现类型安全的 API 调用
 * @impact 所有调用 pluginApi 的代码保持兼容，仅底层实现从 fetch 切换为 Hono RPC
 */

import { apiClient } from './apiClient'
import type {
  PluginListItem,
  PluginDetail,
  Category,
  Review,
  MarketplaceStats,
  PluginListResult,
  PluginListParams,
  SearchParams,
} from '@shared/modules/plugins'

export type {
  PluginListItem,
  PluginDetail,
  Category,
  Review,
  MarketplaceStats,
  PluginListResult,
  PluginListParams,
  SearchParams,
}

export const pluginApi = {
  list: async (params: PluginListParams = {}) => {
    const query: Record<string, string | undefined> = {}
    if (params.category) query.category = params.category
    if (params.tag) query.tag = params.tag
    if (params.sort) query.sort = params.sort
    if (params.page != null) query.page = String(params.page)
    if (params.limit != null) query.limit = String(params.limit)
    if (params.featured != null) query.featured = String(params.featured)
    const res = await apiClient.api.plugins.$get({ query })
    return res.json()
  },

  search: async (params: SearchParams) => {
    const res = await apiClient.api.plugins.search.$get({
      query: {
        q: params.q,
        tag: params.tag,
        site: params.site,
        category: params.category,
        page: params.page ? String(params.page) : undefined,
        limit: params.limit ? String(params.limit) : undefined,
      },
    })
    return res.json()
  },

  get: async (slug: string) => {
    const res = await apiClient.api.plugins[':slug'].$get({
      param: { slug },
    })
    return res.json()
  },

  getVersions: async (slug: string) => {
    const res = await apiClient.api.plugins[':slug'].versions.$get({
      param: { slug },
    })
    return res.json()
  },

  getReviews: async (slug: string, page = 1, limit = 20) => {
    const res = await apiClient.api.plugins[':slug'].reviews.$get({
      param: { slug },
      query: { page: String(page), limit: String(limit) },
    })
    return res.json()
  },

  trackInstall: async (slug: string) => {
    const res = await apiClient.api.plugins[':slug'].install.$post({
      param: { slug },
    })
    return res.json()
  },

  categories: async () => {
    const res = await apiClient.api.categories.$get()
    return res.json()
  },

  categoryPlugins: async (slug: string, page = 1, limit = 20) => {
    const res = await apiClient.api.categories[':slug'].plugins.$get({
      param: { slug },
      query: { page: String(page), limit: String(limit) },
    })
    return res.json()
  },

  stats: async () => {
    const res = await apiClient.api.stats.$get()
    return res.json()
  },
}
