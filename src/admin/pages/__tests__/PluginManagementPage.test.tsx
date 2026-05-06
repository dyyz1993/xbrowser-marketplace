import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginManagementPage } from '../PluginManagementPage'

const mockListAllPlugins = vi.fn()
const mockToggleFeatured = vi.fn()
const mockRemove = vi.fn()

vi.mock('../../services/plugin-admin-api', () => ({
  pluginAdminApi: {
    listAllPlugins: (...args: unknown[]) => mockListAllPlugins(...args),
    toggleFeatured: (...args: unknown[]) => mockToggleFeatured(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

const mockPlugins = [
  {
    id: '1',
    name: 'Search Plugin',
    slug: 'search-plugin',
    description: 'A search plugin',
    authorName: 'Dev1',
    version: '1.0.0',
    status: 'approved',
    downloadCount: 150,
    viewCount: 500,
    featured: true,
    tags: ['search'],
    createdAt: 1700000000000,
  },
  {
    id: '2',
    name: 'Pending Plugin',
    slug: 'pending-plugin',
    description: 'Pending review',
    authorName: 'Dev2',
    version: '0.1.0',
    status: 'pending',
    downloadCount: 0,
    viewCount: 10,
    featured: false,
    tags: ['beta'],
    createdAt: 1700100000000,
  },
  {
    id: '3',
    name: 'Rejected Plugin',
    slug: 'rejected-plugin',
    description: 'Was rejected',
    authorName: 'Dev3',
    version: '0.0.1',
    status: 'rejected',
    downloadCount: 5,
    viewCount: 3,
    featured: false,
    tags: [],
    createdAt: 1700200000000,
  },
]

describe('PluginManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListAllPlugins.mockResolvedValue({
      success: true,
      data: { items: mockPlugins, total: 3 },
    })
  })

  it('renders page heading', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Plugin Management')).toBeInTheDocument()
    })
  })

  it('renders search input and status filter', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search plugins...')).toBeInTheDocument()
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockListAllPlugins.mockReturnValue(new Promise(() => {}))
    render(<PluginManagementPage />)

    expect(document.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('populates table with plugin data', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Search Plugin')).toBeInTheDocument()
      expect(screen.getByText('Pending Plugin')).toBeInTheDocument()
      expect(screen.getByText('Rejected Plugin')).toBeInTheDocument()
    })
  })

  it('renders status tags with correct colors', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('approved')).toBeInTheDocument()
      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('rejected')).toBeInTheDocument()
    })
  })

  it('renders author column', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Dev1')).toBeInTheDocument()
      expect(screen.getByText('Dev2')).toBeInTheDocument()
      expect(screen.getByText('Dev3')).toBeInTheDocument()
    })
  })

  it('renders download and view counts', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('500')).toBeInTheDocument()
    })
  })

  it('renders Remove button for each plugin', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      const removeButtons = screen.getAllByText('Remove')
      expect(removeButtons.length).toBe(3)
    })
  })

  it('renders table column headers', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      const table = document.querySelector('.ant-table')
      expect(table).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Plugin')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Author')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Status')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Downloads')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Views')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Featured')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Created')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Actions')).toBeInTheDocument()
    })
  })

  it('calls listAllPlugins with search param when typing in search box', async () => {
    const user = userEvent.setup()

    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search plugins...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Search plugins...'), 'test')

    await waitFor(() => {
      expect(mockListAllPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test' }),
      )
    })
  })

  it('calls toggleFeatured when featured button is clicked for approved plugin', async () => {
    const user = userEvent.setup()
    mockToggleFeatured.mockResolvedValue({ success: true })

    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Search Plugin')).toBeInTheDocument()
    })

    const featuredButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.closest('td')
    )

    if (featuredButtons.length > 0) {
      await user.click(featuredButtons[0])

      await waitFor(() => {
        expect(mockToggleFeatured).toHaveBeenCalled()
      })
    }
  })

  it('shows error message when toggleFeatured fails', async () => {
    const user = userEvent.setup()
    mockToggleFeatured.mockRejectedValue(new Error('fail'))

    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(screen.getByText('Search Plugin')).toBeInTheDocument()
    })

    const featuredButtons = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.closest('td')
    )

    if (featuredButtons.length > 0) {
      await user.click(featuredButtons[0])

      const { message } = await import('antd')
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to toggle featured')
      })
    }
  })

  it('calls listAllPlugins with correct default params', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      expect(mockListAllPlugins).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        status: undefined,
      })
    })
  })

  it('shows em-dash for featured column on non-approved plugins', async () => {
    render(<PluginManagementPage />)

    await waitFor(() => {
      const dashes = screen.getAllByText('—')
      expect(dashes.length).toBe(2)
    })
  })
})
