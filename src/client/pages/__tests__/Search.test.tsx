import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SearchPage } from '../Search'
import type { PluginListItem, Category } from '@shared/modules/plugins'

const { mockSetSearchParams, mockUseSearchParams } = vi.hoisted(() => {
  const setSearch = vi.fn()
  const searchParams = vi.fn(() => [new URLSearchParams(), setSearch])
  return { mockSetSearchParams: setSearch, mockUseSearchParams: searchParams }
})

vi.mock('react-router-dom', () => ({
  useSearchParams: mockUseSearchParams,
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

interface MockPluginStore {
  plugins: PluginListItem[]
  currentPlugin: null
  categories: Category[]
  stats: null
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
  featured: false,
  screenshotUrl: null,
  tags: ['test'],
  siteUrls: [],
  commands: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'E-Commerce',
  slug: 'e-commerce',
  description: null,
  icon: null,
  sortOrder: null,
  pluginCount: 5,
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

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
  }
})

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.plugins = []
    mockStore.categories = []
    mockStore.loading = false
    mockStore.error = null
    mockStore.pagination = { page: 1, pageSize: 20, total: 0 }
  })

  describe('Initial Render', () => {
    it('should render search bar on page', () => {
      render(<SearchPage />)
      expect(screen.getByPlaceholderText('Search plugins, tags, sites...')).toBeInTheDocument()
    })

    it('should call fetchCategories on mount', () => {
      render(<SearchPage />)
      expect(mockStore.fetchCategories).toHaveBeenCalledTimes(1)
    })

    it('should call fetchPlugins with default params on mount', () => {
      render(<SearchPage />)
      expect(mockStore.fetchPlugins).toHaveBeenCalledWith({ sort: 'newest', page: 1, limit: 20 })
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockStore.loading = true
      render(<SearchPage />)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no plugins found', () => {
      render(<SearchPage />)
      expect(screen.getByText('No plugins found')).toBeInTheDocument()
    })

    it('should show search term in empty state message', () => {
      const params = new URLSearchParams('q=test-query')
      mockUseSearchParams.mockReturnValueOnce([params, mockSetSearchParams])

      render(<SearchPage />)
      expect(screen.getByText(/No plugins found for "test-query"/)).toBeInTheDocument()
    })
  })

  describe('Results Display', () => {
    it('should display plugins when available', () => {
      mockStore.plugins = [createMockPlugin({ name: 'Result Plugin' })]
      mockStore.pagination = { page: 1, pageSize: 20, total: 1 }
      render(<SearchPage />)
      expect(screen.getByText('Result Plugin')).toBeInTheDocument()
    })

    it('should display result count', () => {
      mockStore.plugins = [createMockPlugin()]
      mockStore.pagination = { page: 1, pageSize: 20, total: 5 }
      render(<SearchPage />)
      expect(screen.getByText(/5 results?/)).toBeInTheDocument()
    })

    it('should display singular result text for single result', () => {
      mockStore.plugins = [createMockPlugin()]
      mockStore.pagination = { page: 1, pageSize: 20, total: 1 }
      render(<SearchPage />)
      expect(screen.getByText('1 result')).toBeInTheDocument()
    })
  })

  describe('Search with Query', () => {
    it('should call searchPlugins when query parameter exists', () => {
      const params = new URLSearchParams('q=amazon')
      mockUseSearchParams.mockReturnValueOnce([params, mockSetSearchParams])

      render(<SearchPage />)
      expect(mockStore.searchPlugins).toHaveBeenCalledWith({
        q: 'amazon',
        category: undefined,
        page: 1,
        limit: 20,
      })
    })

    it('should call fetchPlugins with category when only category param exists', () => {
      const params = new URLSearchParams('category=e-commerce')
      mockUseSearchParams.mockReturnValueOnce([params, mockSetSearchParams])

      render(<SearchPage />)
      expect(mockStore.fetchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'e-commerce' })
      )
    })
  })

  describe('Filter Controls', () => {
    it('should render category filter select', () => {
      mockStore.categories = [createMockCategory()]
      render(<SearchPage />)
      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should render sort select', () => {
      render(<SearchPage />)
      expect(screen.getByText('Newest')).toBeInTheDocument()
    })
  })
})
