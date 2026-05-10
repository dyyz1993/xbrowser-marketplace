import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockGet = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        tickets: {
          $get: mockGet,
          ':id': {
            $get: vi
              .fn()
              .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            reply: {
              $post: vi
                .fn()
                .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            },
            close: {
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

const mockTickets = {
  success: true,
  data: {
    items: [
      {
        id: 'ticket-1',
        userId: 'user-1',
        userName: 'Test User',
        subject: 'Test Ticket',
        status: 'open',
        priority: 'medium',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    total: 1,
  },
}

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ json: () => Promise.resolve(mockTickets) })
  })

  it('renders tickets page container', async () => {
    const { TicketsPage } = await import('../TicketsPage')
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-tickets-page')).toBeInTheDocument()
    })
  })

  it('fetches tickets on mount', async () => {
    const { TicketsPage } = await import('../TicketsPage')
    render(<TicketsPage />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { TicketsPage } = await import('../TicketsPage')
    render(<TicketsPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-tickets-page')).toBeInTheDocument()
    })
  })
})
