import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePluginStore } from '../plugin-store'
import type {
  PluginListItem,
  PluginDetail,
  Category,
  MarketplaceStats,
} from '@shared/modules/plugins'

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

vi.mock('@client/lib/ssg-data', () => ({
  isSSGPage: vi.fn(() => false),
  getSSGData: vi.fn(() => null),
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

function mockDetail(overrides: Partial<PluginDetail> = {}): PluginDetail {
  return {
    id: 'p1',
    name: 'Test Plugin',
    slug: 'test-plugin',
    description: 'A test plugin',
    authorId: 'author-1',
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
    avgRating: 4.5,
    reviewCount: 10,
    readme: '# Readme',
    repositoryUrl: null,
    homepageUrl: null,
    npmPackage: null,
    license: null,
    categories: [],
    versions: [],
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

  it('should fetch plugins with custom params', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 2, limit: 10 },
    })

    await usePluginStore
      .getState()
      .fetchPlugins({ page: 2, limit: 10, sort: 'most_downloaded', featured: true })

    expect(pluginApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10, sort: 'most_downloaded', featured: true })
    )
  })

  it('should use selectedCategory when fetching plugins', async () => {
    usePluginStore.setState({ selectedCategory: 'dev-tools' })
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20 },
    })

    await usePluginStore.getState().fetchPlugins()

    expect(pluginApi.list).toHaveBeenCalledWith(expect.objectContaining({ category: 'dev-tools' }))
  })

  it('should handle fetch plugins error', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'))

    await usePluginStore.getState().fetchPlugins()

    const state = usePluginStore.getState()
    expect(state.error).toBe('Server error')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch plugins with error response', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Custom error msg',
    })

    await usePluginStore.getState().fetchPlugins()

    expect(usePluginStore.getState().error).toBe('Custom error msg')
  })

  it('should handle fetch plugins with non-Error exception', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockRejectedValue('string error')

    await usePluginStore.getState().fetchPlugins()

    expect(usePluginStore.getState().error).toBe('Unknown error')
  })

  it('should fetch plugins append successfully', async () => {
    usePluginStore.setState({ plugins: [mockPlugin()] })
    const newItem = mockPlugin({ id: 'p2', slug: 'plugin-2' })
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items: [newItem], total: 2, page: 2, limit: 20 },
    })

    await usePluginStore.getState().fetchPluginsAppend({ page: 2 })

    const state = usePluginStore.getState()
    expect(state.plugins).toHaveLength(2)
    expect(state.pagination.page).toBe(2)
  })

  it('should handle fetchPluginsAppend error', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Append fail'))

    await usePluginStore.getState().fetchPluginsAppend()

    expect(usePluginStore.getState().error).toBe('Append fail')
  })

  it('should handle fetchPluginsAppend with error response', async () => {
    ;(pluginApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Append error msg',
    })

    await usePluginStore.getState().fetchPluginsAppend()

    expect(usePluginStore.getState().error).toBe('Append error msg')
  })

  it('should search plugins successfully', async () => {
    const items = [mockPlugin({ name: 'Search Result' })]
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items, total: 1, page: 1, limit: 20 },
    })

    await usePluginStore.getState().searchPlugins({ q: 'test' })

    expect(usePluginStore.getState().plugins).toHaveLength(1)
    expect(pluginApi.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'test' }))
  })

  it('should handle search plugins error', async () => {
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Search fail'))

    await usePluginStore.getState().searchPlugins({ q: 'test' })

    expect(usePluginStore.getState().error).toBe('Search fail')
  })

  it('should handle search plugins with error response', async () => {
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Search error msg',
    })

    await usePluginStore.getState().searchPlugins({ q: 'test' })

    expect(usePluginStore.getState().error).toBe('Search error msg')
  })

  it('should search plugins append successfully', async () => {
    usePluginStore.setState({ plugins: [mockPlugin()] })
    const newItem = mockPlugin({ id: 'p2' })
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { items: [newItem], total: 2, page: 2, limit: 20 },
    })

    await usePluginStore.getState().searchPluginsAppend({ q: 'test', page: 2 })

    expect(usePluginStore.getState().plugins).toHaveLength(2)
  })

  it('should handle searchPluginsAppend error', async () => {
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Search append fail')
    )

    await usePluginStore.getState().searchPluginsAppend({ q: 'test' })

    expect(usePluginStore.getState().error).toBe('Search append fail')
  })

  it('should handle searchPluginsAppend with error response', async () => {
    ;(pluginApi.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Search append error',
    })

    await usePluginStore.getState().searchPluginsAppend({ q: 'test' })

    expect(usePluginStore.getState().error).toBe('Search append error')
  })

  it('should fetch single plugin detail', async () => {
    const detail = mockDetail()
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: detail,
    })

    await usePluginStore.getState().fetchPlugin('test-plugin')

    const state = usePluginStore.getState()
    expect(state.currentPlugin).not.toBeNull()
    expect(state.currentPlugin!.slug).toBe('test-plugin')
    expect(state.loading).toBe(false)
  })

  it('should handle fetch plugin error', async () => {
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))

    await usePluginStore.getState().fetchPlugin('bad-plugin')

    expect(usePluginStore.getState().error).toBe('Not found')
    expect(usePluginStore.getState().loading).toBe(false)
  })

  it('should handle fetch plugin with error response', async () => {
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Plugin not found',
    })

    await usePluginStore.getState().fetchPlugin('missing-plugin')

    expect(usePluginStore.getState().error).toBe('Plugin not found')
  })

  it('should handle fetch plugin with error response and no error message', async () => {
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: undefined,
    })

    await usePluginStore.getState().fetchPlugin('missing')

    expect(usePluginStore.getState().error).toBe('Plugin not found')
  })

  it('should handle fetch plugin with non-Error exception', async () => {
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockRejectedValue('string error')

    await usePluginStore.getState().fetchPlugin('bad')

    expect(usePluginStore.getState().error).toBe('Unknown error')
  })

  it('should refresh plugin when slug matches existing currentPlugin', async () => {
    usePluginStore.setState({ currentPlugin: mockDetail({ slug: 'test-plugin' }) })
    const updatedDetail = mockDetail({ slug: 'test-plugin', version: '2.0.0' })
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: updatedDetail,
    })

    await usePluginStore.getState().fetchPlugin('test-plugin')

    expect(usePluginStore.getState().currentPlugin!.version).toBe('2.0.0')
    expect(usePluginStore.getState().loading).toBe(false)
  })

  it('should keep SSG data on refresh error when slug matches', async () => {
    usePluginStore.setState({ currentPlugin: mockDetail({ slug: 'test-plugin' }) })
    ;(pluginApi.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    await usePluginStore.getState().fetchPlugin('test-plugin')

    expect(usePluginStore.getState().currentPlugin).not.toBeNull()
    expect(usePluginStore.getState().currentPlugin!.slug).toBe('test-plugin')
  })

  it('should fetch categories successfully', async () => {
    const cats: Category[] = [
      {
        id: 'c1',
        name: 'Dev Tools',
        slug: 'dev-tools',
        description: null,
        icon: null,
        sortOrder: null,
        pluginCount: 5,
      },
    ]
    ;(pluginApi.categories as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: cats,
    })

    await usePluginStore.getState().fetchCategories()

    expect(usePluginStore.getState().categories).toHaveLength(1)
  })

  it('should handle fetch categories error gracefully', async () => {
    ;(pluginApi.categories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'))

    await usePluginStore.getState().fetchCategories()

    expect(usePluginStore.getState().categories).toEqual([])
  })

  it('should keep existing categories on error if present', async () => {
    usePluginStore.setState({
      categories: [
        {
          id: 'c1',
          name: 'Existing',
          slug: 'existing',
          description: null,
          icon: null,
          sortOrder: null,
          pluginCount: 1,
        },
      ],
    })
    ;(pluginApi.categories as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'))

    await usePluginStore.getState().fetchCategories()

    expect(usePluginStore.getState().categories).toHaveLength(1)
  })

  it('should fetch stats successfully', async () => {
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

  it('should handle fetch stats error gracefully', async () => {
    ;(pluginApi.stats as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'))

    await usePluginStore.getState().fetchStats()

    expect(usePluginStore.getState().stats).toBeNull()
  })

  it('should track install', async () => {
    ;(pluginApi.trackInstall as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    await usePluginStore.getState().trackInstall('test-plugin')

    expect(pluginApi.trackInstall).toHaveBeenCalledWith('test-plugin')
  })

  it('should handle track install error gracefully', async () => {
    ;(pluginApi.trackInstall as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'))

    await expect(usePluginStore.getState().trackInstall('test-plugin')).resolves.toBeUndefined()
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

  it('should update page while preserving other pagination fields', () => {
    usePluginStore.setState({ pagination: { page: 1, pageSize: 20, total: 100 } })
    usePluginStore.getState().setPage(3)
    const p = usePluginStore.getState().pagination
    expect(p.page).toBe(3)
    expect(p.pageSize).toBe(20)
    expect(p.total).toBe(100)
  })
})
