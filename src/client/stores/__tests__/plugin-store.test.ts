import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePluginStore } from '../plugin-store'
import type { PluginListItem, PluginDetail, Category, MarketplaceStats } from '@shared/modules/plugins'

vi.mock('@client/services/plugin-api', () => ({
  pluginApi: {
    list: vi.fn(),
    search: vi.fn(),
    get: vi.fn(),
    categories: vi.fn(),
    stats: vi.fn(),
    trackInstall: vi.fn(),
  },
}))

const { pluginApi } = await import('@client/services/plugin-api')

function mockPlugin(overrides: Partial<PluginListItem> = {}): PluginListItem {
  return {
    id: 'p1',
    name: 'Test Plugin',
    slug: 'test-plugin',
    description: 'A test plugin',
    authorName: 'Author',
    version: '1.0.0',
    status: 'approved',
    downloadCount: 10,
    viewCount: 100,
    featured: false,
    screenshotUrl: null,
    tags: [],
    siteUrls: [],
    commands: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('pluginStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePluginStore.setState({
      plugins: [],
      currentPlugin: null,
      categories: [],
      stats: null,
      searchQuery: '',
      selectedCategory: null,
      loading: false,
      error: null,
      pagination: { page: 1, pageSize: 20, total: 0 },
    })
  })

  it('should have correct initial state', () => {
    const state = usePluginStore.getState()
    expect(state.plugins).toEqual([])
    expect(state.currentPlugin).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.pagination.page).toBe(1)
  })

  it('should fetch plugins successfully', async () => {
    const items = [mockPlugin(), mockPlugin({ id: 'p2', slug: 'plugin-2' })]
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items, total: 2, page: 1, limit: 20 },
    })

    await usePluginStore.getState().fetchPlugins()

    const state = usePluginStore.getState()
    expect(state.plugins).toHaveLength(2)
    expect(state.loading).toBe(false)
    expect(state.pagination.total).toBe(2)
  })

  it('should handle fetch plugins error', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Server error')
    )

    await usePluginStore.getState().fetchPlugins()

    const state = usePluginStore.getState()
    expect(state.error).toBe('Server error')
    expect(state.loading).toBe(false)
  })

  it('should search plugins', async () => {
    const items = [mockPlugin({ name: 'Search Result' })]
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items, total: 1, page: 1, limit: 20 },
    })

    await usePluginStore.getState().searchPlugins({ q: 'test' })

    expect(usePluginStore.getState().plugins).toHaveLength(1)
    expect(pluginApi.search).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'test' })
    )
  })

  it('should fetch single plugin detail', async () => {
    const detail: PluginDetail = {
      ...mockPlugin(),
      authorId: 'author-1',
      readme: '# Readme',
      repositoryUrl: null,
      homepageUrl: null,
      npmPackage: null,
      license: null,
      categories: [],
      versions: [],
    }
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: detail,
    })

    await usePluginStore.getState().fetchPlugin('test-plugin')

    const state = usePluginStore.getState()
    expect(state.currentPlugin).not.toBeNull()
    expect(state.currentPlugin!.slug).toBe('test-plugin')
  })

  it('should fetch categories', async () => {
    const cats: Category[] = [
      { id: 'c1', name: 'Dev Tools', slug: 'dev-tools', description: null, icon: null, sortOrder: null, pluginCount: 5 },
    ]
    ;(pluginApi.categories as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: cats,
    })

    await usePluginStore.getState().fetchCategories()

    expect(usePluginStore.getState().categories).toHaveLength(1)
  })

  it('should fetch stats', async () => {
    const stats: MarketplaceStats = {
      totalPlugins: 42,
      totalDownloads: 1000,
      totalCategories: 5,
      totalReviews: 200,
      recentPlugins: [],
    }
    ;(pluginApi.stats as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: stats,
    })

    await usePluginStore.getState().fetchStats()

    expect(usePluginStore.getState().stats?.totalPlugins).toBe(42)
  })

  it('should update search query', () => {
    usePluginStore.getState().setSearchQuery('my query')
    expect(usePluginStore.getState().searchQuery).toBe('my query')
  })

  it('should update selected category', () => {
    usePluginStore.getState().setSelectedCategory('dev-tools')
    expect(usePluginStore.getState().selectedCategory).toBe('dev-tools')

    usePluginStore.getState().setSelectedCategory(null)
    expect(usePluginStore.getState().selectedCategory).toBeNull()
  })

  it('should update page', () => {
    usePluginStore.getState().setPage(3)
    expect(usePluginStore.getState().pagination.page).toBe(3)
  })
})
