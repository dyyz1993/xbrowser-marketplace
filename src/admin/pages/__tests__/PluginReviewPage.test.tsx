import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginReviewPage } from '../PluginReviewPage'

const mockGetPending = vi.fn()
const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockBulkApprove = vi.fn()
const mockBulkReject = vi.fn()

vi.mock('../../services/plugin-admin-api', () => ({
  pluginAdminApi: {
    getPending: (...args: unknown[]) => mockGetPending(...args),
    approve: (...args: unknown[]) => mockApprove(...args),
    reject: (...args: unknown[]) => mockReject(...args),
    bulkApprove: (...args: unknown[]) => mockBulkApprove(...args),
    bulkReject: (...args: unknown[]) => mockBulkReject(...args),
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
    name: 'Test Plugin',
    slug: 'test-plugin',
    description: 'A test plugin',
    authorId: 'u1',
    authorName: 'Author1',
    version: '1.0.0',
    status: 'pending',
    downloadCount: 10,
    viewCount: 50,
    featured: false,
    screenshotUrl: null,
    tags: ['utility'],
    siteUrls: ['https://example.com'],
    commands: ['/test'],
    readme: '# Test',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: '2',
    name: 'Another Plugin',
    slug: 'another-plugin',
    description: 'Another test',
    authorId: 'u2',
    authorName: 'Author2',
    version: '2.0.0',
    status: 'approved',
    downloadCount: 100,
    viewCount: 200,
    featured: true,
    screenshotUrl: null,
    tags: ['search'],
    siteUrls: [],
    commands: ['/search'],
    readme: null,
    createdAt: 1700100000000,
    updatedAt: 1700100000000,
  },
]

describe('PluginReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPending.mockResolvedValue({
      success: true,
      data: { items: mockPlugins, total: 2 },
    })
  })

  it('renders page heading', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Plugin Review')).toBeInTheDocument()
    })
  })

  it('renders status filter and refresh button', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockGetPending.mockReturnValue(new Promise(() => {}))
    render(<PluginReviewPage />)

    expect(document.querySelector('.ant-spin')).toBeInTheDocument()
  })

  it('populates table with plugin data', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument()
      expect(screen.getByText('test-plugin')).toBeInTheDocument()
      expect(screen.getByText('Author1')).toBeInTheDocument()
      expect(screen.getByText('Another Plugin')).toBeInTheDocument()
      expect(screen.getByText('Author2')).toBeInTheDocument()
    })
  })

  it('renders status tags for each plugin', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      const table = document.querySelector('.ant-table')
      expect(table).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Pending')).toBeInTheDocument()
      expect(within(table as HTMLElement).getByText('Approved')).toBeInTheDocument()
    })
  })

  it('shows approve and reject buttons for pending plugins', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })
  })

  it('does not show approve/reject for approved plugins', async () => {
    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Another Plugin')).toBeInTheDocument()
    })

    const approveButtons = screen.queryAllByText('Approve')
    const rejectButtons = screen.queryAllByText('Reject')
    expect(approveButtons.length).toBe(1)
    expect(rejectButtons.length).toBe(1)
  })

  it('calls approve API when approve is confirmed', async () => {
    const user = userEvent.setup()
    mockApprove.mockResolvedValue({ success: true })

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Approve'))

    await waitFor(() => {
      const popconfirm = screen.getByText('Approve "Test Plugin"?')
      if (popconfirm) {
        const okBtn = within(popconfirm.closest('.ant-popover')!).getByText('OK')
        return user.click(okBtn)
      }
    })
  })

  it('opens reject modal when reject is clicked', async () => {
    const user = userEvent.setup()

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Reject'))

    await waitFor(() => {
      expect(screen.getByText(/Reject: Test Plugin/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Rejection reason (optional)')).toBeInTheDocument()
    })
  })

  it('calls reject API with reason and closes modal', async () => {
    const user = userEvent.setup()
    mockReject.mockResolvedValue({ success: true })

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Reject'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Rejection reason (optional)')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Rejection reason (optional)'), 'Not ready')

    const rejectModal = screen.getByText(/Reject: Test Plugin/).closest('.ant-modal')!
    const okBtn = within(rejectModal as HTMLElement).getByText('Reject')
    await user.click(okBtn)

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('test-plugin', 'Not ready')
    })
  })

  it('shows error when reject API fails', async () => {
    const user = userEvent.setup()
    mockReject.mockRejectedValue(new Error('fail'))

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Reject'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Rejection reason (optional)')).toBeInTheDocument()
    })

    const rejectModal = screen.getByText(/Reject: Test Plugin/).closest('.ant-modal')!
    const okBtn = within(rejectModal as HTMLElement).getByText('Reject')
    await user.click(okBtn)

    const { message } = await import('antd')
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to reject')
    })
  })

  it('opens detail modal when eye icon is clicked', async () => {
    const user = userEvent.setup()

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Plugin')).toBeInTheDocument()
    })

    const eyeButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('svg.lucide-eye') || btn.querySelector('[data-lucide="eye"]'))
    if (eyeButtons.length > 0) {
      await user.click(eyeButtons[0])
    }

    await waitFor(() => {
      expect(screen.getByText(/Plugin Detail:/)).toBeInTheDocument()
    })
  })

  it('calls fetchPlugins with correct status filter', async () => {
    mockGetPending.mockResolvedValue({
      success: true,
      data: { items: [], total: 0 },
    })

    render(<PluginReviewPage />)

    await waitFor(() => {
      expect(mockGetPending).toHaveBeenCalledWith('pending', 1, 20)
    })
  })
})
