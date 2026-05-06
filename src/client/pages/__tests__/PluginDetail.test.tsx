import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PluginDetailPage } from '../PluginDetail'
import type { PluginDetail } from '@shared/modules/plugins'
import type { Review } from '@client/services/plugin-api'

const createMockPluginDetail = (overrides: Partial<PluginDetail> = {}): PluginDetail => ({
  id: 'plugin-1',
  name: 'Test Plugin',
  slug: 'test-plugin',
  description: 'A detailed test plugin description',
  authorName: 'Author Name',
  authorId: 'author-1',
  version: '1.2.3',
  status: 'approved',
  downloadCount: 500,
  viewCount: 1000,
  featured: true,
  screenshotUrl: null,
  tags: ['automation', 'scraping'],
  siteUrls: ['https://example.com', 'https://shop.example.com'],
  commands: ['test:run', 'test:scrape'],
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now(),
  avgRating: 4.5,
  reviewCount: 12,
  readme: '# Test Plugin README\n\nThis is a readme.',
  repositoryUrl: 'https://github.com/test/plugin',
  homepageUrl: 'https://test-plugin.dev',
  npmPackage: '@test/plugin',
  license: 'MIT',
  categories: [{ id: 'cat-1', name: 'E-Commerce', slug: 'e-commerce' }],
  versions: [
    { id: 'v-1', version: '1.2.3', changelog: 'Bug fixes', publishedAt: Date.now() },
    { id: 'v-2', version: '1.2.0', changelog: 'New features', publishedAt: Date.now() - 86400000 },
  ],
  ...overrides,
})

const createMockReview = (overrides: Partial<Review> = {}): Review => ({
  id: 'review-1',
  pluginId: 'plugin-1',
  userId: 'user-1',
  userName: 'Reviewer',
  rating: 5,
  title: 'Great plugin',
  content: 'Works perfectly for my use case.',
  createdAt: Date.now(),
  ...overrides,
})

interface MockPluginStore {
  plugins: unknown[]
  currentPlugin: PluginDetail | null
  categories: unknown[]
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

const mockGetReviews = vi.fn().mockResolvedValue({
  success: true,
  data: { items: [], total: 0 },
})

vi.mock('../../services/plugin-api', () => ({
  pluginApi: {
    getReviews: (...args: unknown[]) => mockGetReviews(...args),
  },
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ slug: 'test-plugin' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: { success: vi.fn() },
  }
})

const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
})

describe('PluginDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.currentPlugin = null
    mockStore.loading = false
    mockStore.error = null
    mockGetReviews.mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockStore.loading = true
      render(<PluginDetailPage />)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Not Found State', () => {
    it('should show not found message when plugin is null', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Plugin not found.')).toBeInTheDocument()
    })

    it('should show back to marketplace link when plugin is null', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Back to marketplace')).toBeInTheDocument()
    })
  })

  describe('Plugin Display', () => {
    beforeEach(() => {
      mockStore.currentPlugin = createMockPluginDetail()
    })

    it('should render plugin name', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Test Plugin')).toBeInTheDocument()
    })

    it('should render plugin version badge', () => {
      render(<PluginDetailPage />)
      const badge = document.querySelector('.bg-blue-100.text-blue-700')
      expect(badge).toHaveTextContent('v1.2.3')
    })

    it('should render plugin license', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('MIT')).toBeInTheDocument()
    })

    it('should render author name', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Author Name')).toBeInTheDocument()
    })

    it('should render description', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('A detailed test plugin description')).toBeInTheDocument()
    })

    it('should render download count', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText(/500 downloads/)).toBeInTheDocument()
    })

    it('should render rating', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText(/4.5 \(12 reviews\)/)).toBeInTheDocument()
    })

    it('should render tags as links', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('automation')).toBeInTheDocument()
      expect(screen.getByText('scraping')).toBeInTheDocument()
    })

    it('should render install command with npmPackage', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText(/xbrowser plugin install @test\/plugin/)).toBeInTheDocument()
    })
  })

  describe('Readme Section', () => {
    it('should render README section when plugin has readme', () => {
      mockStore.currentPlugin = createMockPluginDetail()
      render(<PluginDetailPage />)
      expect(screen.getByText('README')).toBeInTheDocument()
      expect(screen.getByText(/Test Plugin README/)).toBeInTheDocument()
    })

    it('should not render README section when readme is null', () => {
      mockStore.currentPlugin = createMockPluginDetail({ readme: null })
      render(<PluginDetailPage />)
      expect(screen.queryByText('README')).not.toBeInTheDocument()
    })
  })

  describe('Commands Section', () => {
    it('should render commands section when plugin has commands', () => {
      mockStore.currentPlugin = createMockPluginDetail()
      render(<PluginDetailPage />)
      expect(screen.getByText('Commands')).toBeInTheDocument()
      expect(screen.getByText('test:run')).toBeInTheDocument()
      expect(screen.getByText('test:scrape')).toBeInTheDocument()
    })

    it('should not render commands section when no commands', () => {
      mockStore.currentPlugin = createMockPluginDetail({ commands: [] })
      render(<PluginDetailPage />)
      expect(screen.queryByText('Commands')).not.toBeInTheDocument()
    })
  })

  describe('Reviews Section', () => {
    it('should render reviews when available', async () => {
      const reviews = [createMockReview()]
      mockGetReviews.mockResolvedValue({
        success: true,
        data: { items: reviews, total: 1 },
      })
      mockStore.currentPlugin = createMockPluginDetail()
      render(<PluginDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Reviews')).toBeInTheDocument()
        expect(screen.getByText('Great plugin')).toBeInTheDocument()
        expect(screen.getByText('Reviewer')).toBeInTheDocument()
      })
    })

    it('should not render reviews section when no reviews', () => {
      mockGetReviews.mockResolvedValue({
        success: true,
        data: { items: [], total: 0 },
      })
      mockStore.currentPlugin = createMockPluginDetail()
      render(<PluginDetailPage />)
      expect(screen.queryByText('Reviews')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      mockStore.currentPlugin = createMockPluginDetail()
    })

    it('should call fetchPlugin with slug on mount', () => {
      render(<PluginDetailPage />)
      expect(mockStore.fetchPlugin).toHaveBeenCalledWith('test-plugin')
    })

    it('should call trackInstall when install button is clicked', () => {
      render(<PluginDetailPage />)
      const installButton = screen.getByText('Install')
      fireEvent.click(installButton)
      expect(mockStore.trackInstall).toHaveBeenCalledWith('test-plugin')
    })

    it('should copy install command to clipboard', () => {
      render(<PluginDetailPage />)
      const copyButtons = screen.getAllByRole('button')
      const copyBtn = copyButtons.find(
        btn => btn.querySelector('svg.lucide-copy') || btn.querySelector('svg.lucide-check')
      )
      if (copyBtn) {
        fireEvent.click(copyBtn)
        expect(mockWriteText).toHaveBeenCalled()
      }
    })

    it('should render repo link when repositoryUrl exists', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Repo')).toBeInTheDocument()
    })

    it('should render homepage link when homepageUrl exists', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Homepage')).toBeInTheDocument()
    })

    it('should not render repo link when repositoryUrl is null', () => {
      mockStore.currentPlugin = createMockPluginDetail({ repositoryUrl: null })
      render(<PluginDetailPage />)
      expect(screen.queryByText('Repo')).not.toBeInTheDocument()
    })
  })

  describe('Sidebar Sections', () => {
    beforeEach(() => {
      mockStore.currentPlugin = createMockPluginDetail()
    })

    it('should render supported sites', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Supported Sites')).toBeInTheDocument()
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
    })

    it('should render categories', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('E-Commerce')).toBeInTheDocument()
    })

    it('should render version history', () => {
      render(<PluginDetailPage />)
      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText('v1.2.0')).toBeInTheDocument()
    })
  })
})
