import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockGet = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        monitor: {
          $get: mockGet,
        },
      },
    },
  },
}))

const mockData = {
  success: true,
  data: {
    stats: {
      totalUsers: 10,
      totalPlugins: 25,
      totalOrders: 5,
      totalTickets: 3,
      totalDisputes: 1,
      totalContents: 8,
      pendingPlugins: 2,
      openTickets: 1,
      pendingOrders: 1,
    },
    recentActivity: [
      {
        id: '1',
        type: 'plugin',
        title: 'Plugin submitted',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        type: 'order',
        title: 'Order placed',
        status: 'completed',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    health: {
      database: 'connected' as const,
      uptime: 86400,
    },
  },
}

describe('MonitorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ json: () => Promise.resolve(mockData) })
  })

  it('renders loading state initially', async () => {
    const { MonitorPage } = await import('../MonitorPage')
    render(<MonitorPage />)

    expect(screen.getByTestId('monitor-container')).toBeInTheDocument()
  })

  it('renders stats after loading', async () => {
    const { MonitorPage } = await import('../MonitorPage')
    render(<MonitorPage />)

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument()
    })

    expect(screen.getByText('Total Plugins')).toBeInTheDocument()
    expect(screen.getByText('Total Orders')).toBeInTheDocument()
    expect(screen.getByText('Open Tickets')).toBeInTheDocument()
  })

  it('renders health status', async () => {
    const { MonitorPage } = await import('../MonitorPage')
    render(<MonitorPage />)

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })
  })

  it('renders recent activity table', async () => {
    const { MonitorPage } = await import('../MonitorPage')
    render(<MonitorPage />)

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Server error' }),
    })

    const { MonitorPage } = await import('../MonitorPage')
    render(<MonitorPage />)

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })
})
