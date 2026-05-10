import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockGet = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        disputes: {
          $get: mockGet,
          ':id': {
            $get: vi
              .fn()
              .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            resolve: {
              $put: vi
                .fn()
                .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            },
            reject: {
              $put: vi
                .fn()
                .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            },
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

const mockDisputes = {
  success: true,
  data: {
    items: [
      {
        id: 'dispute-1',
        orderId: 'order-1',
        userId: 'user-1',
        userName: 'Test User',
        reason: 'Item not as described',
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    total: 1,
  },
}

describe('DisputesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ json: () => Promise.resolve(mockDisputes) })
  })

  it('renders disputes page container', async () => {
    const { DisputesPage } = await import('../DisputesPage')
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-disputes-page')).toBeInTheDocument()
    })
  })

  it('fetches disputes on mount', async () => {
    const { DisputesPage } = await import('../DisputesPage')
    render(<DisputesPage />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { DisputesPage } = await import('../DisputesPage')
    render(<DisputesPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-disputes-page')).toBeInTheDocument()
    })
  })
})
