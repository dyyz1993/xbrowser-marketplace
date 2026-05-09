import { create } from 'zustand'
import type {
  PluginListItem,
  PluginDetail,
  Category,
  MarketplaceStats,
  PluginListParams,
  SearchParams,
} from '@shared/modules/plugins'
import { pluginApi } from '@client/services/plugin-api'
import {
  getSSGData,
  isSSGPage,
  type SSGHomeData,
  type SSGPluginDetailData,
  type SSGCategoriesData,
} from '@client/lib/ssg-data'

function getInitialPlugins(): PluginListItem[] {
  if (!isSSGPage()) return []
  const data = getSSGData<SSGHomeData>()
  if (!data?.plugins) return []
  return data.plugins.map(p => ({
    id: '',
    name: p.name,
    slug: p.slug,
    description: p.description,
    authorName: '',
    version: '',
    status: 'approved',
    downloadCount: p.downloads,
    viewCount: 0,
    featured: false,
    screenshotUrl: null,
    tags: [],
    siteUrls: [],
    commands: [],
    createdAt: 0,
    updatedAt: 0,
    avgRating: p.avgRating,
  }))
}

function getInitialCategories(): Category[] {
  if (!isSSGPage()) return []
  const data = getSSGData<SSGHomeData | SSGCategoriesData>()
  if (!data) return []
  if ('categories' in data && Array.isArray(data.categories)) {
    return data.categories.map(c => ({
      id: '',
      name: c.name,
      slug: c.slug,
      description:
        'description' in c ? ((c as Record<string, unknown>).description as string | null) : null,
      icon: null,
      sortOrder: null,
      pluginCount:
        'count' in c
          ? ((c as Record<string, unknown>).count as number)
          : 'pluginCount' in c
            ? ((c as Record<string, unknown>).pluginCount as number)
            : 0,
    }))
  }
  return []
}

function getInitialCurrentPlugin(): PluginDetail | null {
  if (!isSSGPage()) return null
  const data = getSSGData<SSGPluginDetailData>()
  if (!data?.plugin) return null
  const p = data.plugin
  return {
    id: '',
    name: p.name,
    slug: p.slug,
    description: p.description,
    authorId: '',
    authorName: p.author,
    version: p.version,
    status: 'approved',
    downloadCount: p.downloads,
    viewCount: 0,
    featured: false,
    screenshotUrl: null,
    tags: [],
    siteUrls: [],
    commands: [],
    createdAt: 0,
    updatedAt: 0,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
    readme: null,
    repositoryUrl: null,
    homepageUrl: null,
    npmPackage: null,
    license: null,
    categories: [],
    versions: [],
  }
}

function getInitialPagination() {
  if (!isSSGPage()) return { page: 1, pageSize: 20, total: 0 }
  const data = getSSGData<SSGHomeData>()
  if (!data) return { page: 1, pageSize: 20, total: 0 }
  return { page: 1, pageSize: 20, total: data.totalPlugins ?? data.plugins?.length ?? 0 }
}

interface PluginState {
  plugins: PluginListItem[]
  currentPlugin: PluginDetail | null
  categories: Category[]
  stats: MarketplaceStats | null
  searchQuery: string
  selectedCategory: string | null
  loading: boolean
  error: string | null
  pagination: { page: number; pageSize: number; total: number }

  fetchPlugins: (params?: PluginListParams) => Promise<void>
  fetchPluginsAppend: (params?: PluginListParams) => Promise<void>
  searchPlugins: (params: SearchParams) => Promise<void>
  searchPluginsAppend: (params: SearchParams) => Promise<void>
  fetchPlugin: (slug: string) => Promise<void>
  fetchCategories: () => Promise<void>
  fetchStats: () => Promise<void>
  trackInstall: (slug: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string | null) => void
  setPage: (page: number) => void
}

export const usePluginStore = create<PluginState>((set, get) => ({
  plugins: getInitialPlugins(),
  currentPlugin: getInitialCurrentPlugin(),
  categories: getInitialCategories(),
  stats: null,
  searchQuery: '',
  selectedCategory: null,
  loading: false,
  error: null,
  pagination: getInitialPagination(),

  fetchPlugins: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { pagination, selectedCategory } = get()
      const result = await pluginApi.list({
        page: params.page ?? pagination.page,
        limit: params.limit ?? pagination.pageSize,
        category: params.category ?? selectedCategory ?? undefined,
        sort: params.sort,
        featured: params.featured,
      })
      if (result.success) {
        set({
          plugins: result.data.items,
          pagination: {
            page: result.data.page,
            pageSize: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        let errorText: string = 'Failed to fetch plugins'
        if (!result.success && 'error' in result) {
          errorText = result.error as string
        }
        set({ error: errorText, loading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false })
    }
  },

  fetchPluginsAppend: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const { pagination, selectedCategory, plugins: existingPlugins } = get()
      const result = await pluginApi.list({
        page: params.page ?? pagination.page,
        limit: params.limit ?? pagination.pageSize,
        category: params.category ?? selectedCategory ?? undefined,
        sort: params.sort,
        featured: params.featured,
      })
      if (result.success) {
        set({
          plugins: [...existingPlugins, ...result.data.items],
          pagination: {
            page: result.data.page,
            pageSize: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        let errorText: string = 'Failed to fetch plugins'
        if (!result.success && 'error' in result) {
          errorText = result.error as string
        }
        set({ error: errorText, loading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false })
    }
  },

  searchPlugins: async params => {
    set({ loading: true, error: null })
    try {
      const { pagination } = get()
      const result = await pluginApi.search({
        ...params,
        page: params.page ?? pagination.page,
        limit: params.limit ?? pagination.pageSize,
      })
      if (result.success) {
        set({
          plugins: result.data.items,
          pagination: {
            page: result.data.page,
            pageSize: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        let errorText: string = 'Search failed'
        if (!result.success && 'error' in result) {
          errorText = result.error as string
        }
        set({ error: errorText, loading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false })
    }
  },

  searchPluginsAppend: async params => {
    set({ loading: true, error: null })
    try {
      const { pagination, plugins: existingPlugins } = get()
      const result = await pluginApi.search({
        ...params,
        page: params.page ?? pagination.page,
        limit: params.limit ?? pagination.pageSize,
      })
      if (result.success) {
        set({
          plugins: [...existingPlugins, ...result.data.items],
          pagination: {
            page: result.data.page,
            pageSize: result.data.limit,
            total: result.data.total,
          },
          loading: false,
        })
      } else {
        let errorText: string = 'Search failed'
        if (!result.success && 'error' in result) {
          errorText = result.error as string
        }
        set({ error: errorText, loading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false })
    }
  },

  fetchPlugin: async (slug: string) => {
    const existing = get().currentPlugin
    if (existing && existing.slug === slug) {
      try {
        const result = await pluginApi.get(slug)
        if (result.success) set({ currentPlugin: result.data })
      } catch {
        // keep SSG data
      }
      return
    }
    set({ loading: true, error: null, currentPlugin: null })
    try {
      const result = await pluginApi.get(slug)
      if (result.success) {
        set({ currentPlugin: result.data, loading: false })
      } else {
        set({ error: result.error ?? 'Plugin not found', loading: false })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', loading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const result = await pluginApi.categories()
      if (result.success) {
        set({ categories: result.data })
      }
    } catch (err) {
      if (get().categories.length > 0) return
      console.error('Failed to fetch categories:', err)
    }
  },

  fetchStats: async () => {
    try {
      const result = await pluginApi.stats()
      if (result.success) {
        set({ stats: result.data })
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  },

  trackInstall: async (slug: string) => {
    try {
      await pluginApi.trackInstall(slug)
    } catch (err) {
      console.error('Failed to track install:', err)
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedCategory: (category: string | null) => set({ selectedCategory: category }),
  setPage: (page: number) => set({ pagination: { ...get().pagination, page } }),
}))
