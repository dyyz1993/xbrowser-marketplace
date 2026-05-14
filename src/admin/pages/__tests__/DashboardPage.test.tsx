import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from '../DashboardPage'

const mockStatsGet = vi.fn()
const mockNotificationPost = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        stats: {
          $get: () => mockStatsGet(),
        },
        notifications: {
          test: {
            $post: (...args: unknown[]) => mockNotificationPost(...args),
          },
        },
      },
    },
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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStatsGet.mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            lastUpdated: '2025-01-01',
            totalPlugins: 100,
            pendingPlugins: 15,
            approvedPlugins: 80,
            rejectedPlugins: 5,
            totalDownloads: 5000,
            totalViews: 20000,
            totalReviews: 350,
            activeDevelopers: 25,
          },
        }),
    })
  })

  it('renders dashboard heading', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    mockStatsGet.mockReturnValue(new Promise(() => {}))
    render(<DashboardPage />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays stats cards after data loads', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Plugins')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Total Downloads')).toBeInTheDocument()
      expect(screen.getByText('5,000')).toBeInTheDocument()
      expect(screen.getByText('Active Developers')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('Total Reviews')).toBeInTheDocument()
      expect(screen.getByText('350')).toBeInTheDocument()
    })
  })

  it('notification type selector and send button exist', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('测试通知功能')).toBeInTheDocument()
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })
  })

  it('shows success message after sending test notification', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.success).toHaveBeenCalled()
    })
  })

  it('shows error on notification send failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockRejectedValueOnce(new Error('Failed'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('发送失败')
    })
  })

  it('shows error when notification API returns failure', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    mockNotificationPost.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false }),
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('发送测试通知')).toBeInTheDocument()
    })

    await user.click(screen.getByText('发送测试通知'))

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('发送失败')
    })
  })
})
