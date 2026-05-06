import { apiClient } from './apiClient'

export const pluginAdminApi = {
  getPending: async (status = 'pending', page = 1, limit = 20) => {
    const response = await apiClient.api.admin.plugins.pending.$get({
      query: { status, page: String(page), limit: String(limit) },
    })
    return response.json()
  },

  listAllPlugins: async (
    params: { page?: number; limit?: number; search?: string; status?: string } = {}
  ) => {
    const query: Record<string, string> = {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    }
    if (params.search) query.search = params.search
    if (params.status) query.status = params.status
    const response = await apiClient.api.admin.plugins.$get({ query })
    return response.json()
  },

  approve: async (slug: string) => {
    const response = await apiClient.api.admin.plugins[':slug'].approve.$put({
      param: { slug },
    })
    return response.json()
  },

  reject: async (slug: string, reason: string) => {
    const response = await apiClient.api.admin.plugins[':slug'].reject.$put({
      param: { slug },
      json: { reason },
    })
    return response.json()
  },

  toggleFeatured: async (slug: string) => {
    const response = await apiClient.api.admin.plugins[':slug'].feature.$put({
      param: { slug },
    })
    return response.json()
  },

  remove: async (slug: string) => {
    const response = await apiClient.api.admin.plugins[':slug'].$delete({
      param: { slug },
    })
    return response.json()
  },

  bulkApprove: async (slugs: string[]) => {
    const response = await apiClient.api.admin.plugins['bulk-approve'].$post({
      json: { slugs },
    })
    return response.json()
  },

  bulkReject: async (slugs: string[], reason?: string) => {
    const response = await apiClient.api.admin.plugins['bulk-reject'].$post({
      json: { slugs, reason },
    })
    return response.json()
  },

  getDashboard: async () => {
    const response = await apiClient.api.admin.stats.dashboard.$get()
    return response.json()
  },

  getCategories: async () => {
    const response = await apiClient.api.admin.categories.$get()
    return response.json()
  },

  createCategory: async (data: {
    name: string
    slug: string
    description?: string
    icon?: string
    sortOrder?: number
  }) => {
    const response = await apiClient.api.admin.categories.$post({ json: data })
    return response.json()
  },

  updateCategory: async (
    id: string,
    data: { name?: string; slug?: string; description?: string; icon?: string; sortOrder?: number }
  ) => {
    const response = await apiClient.api.admin.categories[':id'].$put({
      param: { id },
      json: data,
    })
    return response.json()
  },

  deleteCategory: async (id: string) => {
    const response = await apiClient.api.admin.categories[':id'].$delete({
      param: { id },
    })
    return response.json()
  },
}
