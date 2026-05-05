const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<{ success: boolean; data: T; error?: string }> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  return res.json()
}

export interface PluginListItem {
  id: string
  name: string
  slug: string
  description: string
  authorName: string
  version: string
  status: string
  downloadCount: number
  viewCount: number
  featured: boolean
  screenshotUrl: string | null
  tags: string[]
  siteUrls: string[]
  commands: string[]
  createdAt: number
  updatedAt: number
  avgRating?: number
  reviewCount?: number
}

export interface PluginDetail extends PluginListItem {
  authorId: string
  readme: string | null
  repositoryUrl: string | null
  homepageUrl: string | null
  npmPackage: string | null
  license: string | null
  categories: { id: string; name: string; slug: string }[]
  versions: { id: string; version: string; changelog: string | null; publishedAt: number }[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number | null
  pluginCount: number
}

export interface Review {
  id: string
  pluginId: string
  userId: string
  userName: string
  rating: number
  title: string | null
  content: string | null
  createdAt: number
}

export interface MarketplaceStats {
  totalPlugins: number
  totalDownloads: number
  totalCategories: number
  totalReviews: number
  recentPlugins: PluginListItem[]
}

export interface PluginListResult {
  items: PluginListItem[]
  total: number
  page: number
  limit: number
}

export interface PluginListParams {
  page?: number
  limit?: number
  category?: string
  tag?: string
  sort?: 'newest' | 'popular' | 'most_downloaded' | 'name'
  featured?: boolean
}

export interface SearchParams {
  q: string
  tag?: string
  site?: string
  category?: string
  page?: number
  limit?: number
}

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v))
    }
  }
  return sp.toString() ? `?${sp.toString()}` : ''
}

export const pluginApi = {
  list: (params: PluginListParams = {}) =>
    request<PluginListResult>(`/plugins${buildQuery(params as Record<string, unknown>)}`),

  search: (params: SearchParams) =>
    request<PluginListResult>(`/plugins/search${buildQuery(params as unknown as Record<string, unknown>)}`),

  get: (slug: string) => request<PluginDetail>(`/plugins/${slug}`),

  getVersions: (slug: string) =>
    request<
      { id: string; version: string; changelog: string | null; packageUrl: string | null; publishedAt: number }[]
    >(`/plugins/${slug}/versions`),

  getReviews: (slug: string, page = 1, limit = 20) =>
    request<{ items: Review[]; total: number }>(`/plugins/${slug}/reviews${buildQuery({ page, limit })}`),

  trackInstall: (slug: string) =>
    request<{ downloadCount: number }>(`/plugins/${slug}/install`, { method: 'POST' }),

  categories: () => request<Category[]>('/categories'),

  categoryPlugins: (slug: string, page = 1, limit = 20) =>
    request<{ items: PluginListItem[]; total: number }>(
      `/categories/${slug}/plugins${buildQuery({ page, limit })}`
    ),

  stats: () => request<MarketplaceStats>('/stats'),
}
