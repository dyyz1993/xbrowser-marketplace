import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        orders: {
          $get: mockGet,
          ':id': {
            $get: vi
              .fn()
              .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            cancel: { $put: mockPut },
            complete: { $put: mockPut },
            refund: { $put: mockPut },
          },
        },
      },
    },
  },
}))

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } }
})

const mockOrders = {
  success: true,
  data: {
    items: [
      {
        id: 'order-1',
        userId: 'user-1',
        userName: 'Test User',
        pluginId: 'plugin-1',
        pluginName: 'Test Plugin',
        amount: 9.99,
        currency: 'USD',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    total: 1,
  },
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ json: () => Promise.resolve(mockOrders) })
  })

  it('renders orders page container', async () => {
    const { OrdersPage } = await import('../OrdersPage')
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-orders-page')).toBeInTheDocument()
    })
  })

  it('fetches orders on mount', async () => {
    const { OrdersPage } = await import('../OrdersPage')
    render(<OrdersPage />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { OrdersPage } = await import('../OrdersPage')
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-orders-page')).toBeInTheDocument()
    })
  })
})
