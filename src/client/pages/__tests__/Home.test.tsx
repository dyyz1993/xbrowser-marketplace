import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HomePage } from '../Home'
import type { PluginListItem, Category, MarketplaceStats } from '@shared/modules/plugins'

interface MockPluginStore {
  plugins: PluginListItem[]
  currentPlugin: null
  categories: Category[]
  stats: MarketplaceStats | null
  searchQuery: string
  selectedCategory: string | null
  loading: boolean
  error: string | null
  pagination: { page: number; pageSize: number; total: number }
  fetchPlugins: ReturnType<typeof vi.fn>
  searchPlugins: ReturnType<typeof vi.fn>
  fetchPlugin: ReturnType<typeof vi.fn>
  fetchCategories: ReturnType<typeof vi.fn>
  fetchStats: ReturnType<typeof vi.fn>
  trackInstall: ReturnType<typeof vi.fn>
  setSearchQuery: ReturnType<typeof vi.fn>
  setSelectedCategory: ReturnType<typeof vi.fn>
  setPage: ReturnType<typeof vi.fn>
}

const createMockPlugin = (overrides: Partial<PluginListItem> = {}): PluginListItem => ({
  id: 'plugin-1',
  name: 'Test Plugin',
  slug: 'test-plugin',
  description: 'A test plugin',
  authorName: 'Test Author',
  version: '1.0.0',
  status: 'approved',
  downloadCount: 100,
  viewCount: 200,
  featured: true,
  screenshotUrl: null,
  tags: ['test'],
  siteUrls: ['https://example.com'],
  commands: ['test:run'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  avgRating: 4.5,
  reviewCount: 10,
  ...overrides,
})

const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'E-Commerce',
  slug: 'e-commerce',
  description: 'E-Commerce plugins',
  icon: '🛒',
  sortOrder: 1,
  pluginCount: 5,
  ...overrides,
})

const createMockStats = (overrides: Partial<MarketplaceStats> = {}): MarketplaceStats => ({
  totalPlugins: 42,
  totalDownloads: 1000,
  totalCategories: 8,
  totalReviews: 200,
  recentPlugins: [],
  ...overrides,
})

const mockStore: MockPluginStore = {
  plugins: [],
  currentPlugin: null,
  categories: [],
  stats: null,
  searchQuery: '',
  selectedCategory: null,
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 20, total: 0 },
  fetchPlugins: vi.fn(),
  searchPlugins: vi.fn(),
  fetchPlugin: vi.fn(),
  fetchCategories: vi.fn(),
  fetchStats: vi.fn(),
  trackInstall: vi.fn(),
  setSearchQuery: vi.fn(),
  setSelectedCategory: vi.fn(),
  setPage: vi.fn(),
}

vi.mock('../../stores/plugin-store', () => ({
  usePluginStore: vi.fn((selector?: (state: MockPluginStore) => unknown) => {
    if (selector) {
      return selector(mockStore)
    }
    return mockStore
  }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.plugins = []
    mockStore.categories = []
    mockStore.stats = null
    mockStore.loading = false
    mockStore.error = null
  })

  describe('Initial Render', () => {
    it('should render hero title', () => {
      render(<HomePage />)
      expect(screen.getByText('xbrowser Plugin Marketplace')).toBeInTheDocument()
    })

    it('should render hero description', () => {
      render(<HomePage />)
      expect(screen.getByText(/Discover, install, and share/)).toBeInTheDocument()
    })

    it('should call fetchStats, fetchCategories and fetchPlugins on mount', () => {
      render(<HomePage />)
      expect(mockStore.fetchStats).toHaveBeenCalledTimes(1)
      expect(mockStore.fetchCategories).toHaveBeenCalledTimes(1)
      expect(mockStore.fetchPlugins).toHaveBeenCalledWith({ featured: true, limit: 6 })
    })
  })

  describe('Featured Plugins', () => {
    it('should show featured plugins section when plugins exist', () => {
      mockStore.plugins = [createMockPlugin({ name: 'Featured One' })]
      render(<HomePage />)
      expect(screen.getByText('Featured Plugins')).toBeInTheDocument()
      expect(screen.getByText('Featured One')).toBeInTheDocument()
    })

    it('should show loading spinner when loading', () => {
      mockStore.loading = true
      mockStore.plugins = [createMockPlugin()]
      render(<HomePage />)
      expect(screen.getByText('Featured Plugins')).toBeInTheDocument()
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should not show featured plugins section when plugins list is empty', () => {
      render(<HomePage />)
      expect(screen.queryByText('Featured Plugins')).not.toBeInTheDocument()
    })

    it('should render view all link to search page', () => {
      mockStore.plugins = [createMockPlugin()]
      render(<HomePage />)
      const link = screen.getByText('View all')
      expect(link.closest('a')).toHaveAttribute('href', '/search?sort=popular')
    })
  })

  describe('Categories Section', () => {
    it('should show categories section when categories exist', () => {
      mockStore.categories = [createMockCategory()]
      render(<HomePage />)
      expect(screen.getByText('Browse by Category')).toBeInTheDocument()
    })

    it('should not show categories section when no categories', () => {
      render(<HomePage />)
      expect(screen.queryByText('Browse by Category')).not.toBeInTheDocument()
    })
  })

  describe('Recently Added Section', () => {
    it('should show recently added section when stats have recentPlugins', () => {
      mockStore.stats = createMockStats({
        recentPlugins: [createMockPlugin({ name: 'Recent Plugin' })],
      })
      render(<HomePage />)
      expect(screen.getByText('Recently Added')).toBeInTheDocument()
      expect(screen.getByText('Recent Plugin')).toBeInTheDocument()
    })

    it('should not show recently added section when no recentPlugins', () => {
      mockStore.stats = createMockStats({ recentPlugins: [] })
      render(<HomePage />)
      expect(screen.queryByText('Recently Added')).not.toBeInTheDocument()
    })

    it('should render browse all link in recently added section', () => {
      mockStore.stats = createMockStats({
        recentPlugins: [createMockPlugin()],
      })
      render(<HomePage />)
      const links = screen.getAllByText('Browse all')
      expect(links.length).toBeGreaterThan(0)
    })
  })

  describe('Stats Section', () => {
    it('should render stats bar when stats are available', () => {
      mockStore.stats = createMockStats()
      render(<HomePage />)
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })
})
