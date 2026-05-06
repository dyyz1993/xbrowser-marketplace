import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CategoriesPage } from '../Categories'
import type { Category } from '@shared/modules/plugins'

interface MockPluginStore {
  plugins: unknown[]
  currentPlugin: unknown
  categories: Category[]
  stats: unknown
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

const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'E-Commerce',
  slug: 'e-commerce',
  description: 'Plugins for e-commerce sites',
  icon: '🛒',
  sortOrder: 1,
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

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.categories = []
    mockStore.loading = false
    mockStore.error = null
  })

  describe('Initial Render', () => {
    it('should render page title', () => {
      render(<CategoriesPage />)
      expect(screen.getByText('Browse Categories')).toBeInTheDocument()
    })

    it('should render page description', () => {
      render(<CategoriesPage />)
      expect(screen.getByText('Explore plugins organized by category')).toBeInTheDocument()
    })

    it('should call fetchCategories on mount', () => {
      render(<CategoriesPage />)
      expect(mockStore.fetchCategories).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockStore.loading = true
      render(<CategoriesPage />)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no categories', () => {
      render(<CategoriesPage />)
      expect(screen.getByText('No categories available yet.')).toBeInTheDocument()
    })

    it('should show back to marketplace link when no categories', () => {
      render(<CategoriesPage />)
      expect(screen.getByText('Back to marketplace')).toBeInTheDocument()
    })
  })

  describe('Categories Display', () => {
    it('should render categories when available', () => {
      mockStore.categories = [
        createMockCategory({ name: 'E-Commerce', slug: 'e-commerce' }),
        createMockCategory({
          id: 'cat-2',
          name: 'Social Media',
          slug: 'social-media',
          pluginCount: 3,
        }),
      ]
      render(<CategoriesPage />)
      expect(screen.getByText('E-Commerce')).toBeInTheDocument()
      expect(screen.getByText('Social Media')).toBeInTheDocument()
    })

    it('should not show empty state when categories exist', () => {
      mockStore.categories = [createMockCategory()]
      render(<CategoriesPage />)
      expect(screen.queryByText('No categories available yet.')).not.toBeInTheDocument()
    })

    it('should not show loading spinner when not loading with categories', () => {
      mockStore.categories = [createMockCategory()]
      render(<CategoriesPage />)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).not.toBeInTheDocument()
    })
  })
})
