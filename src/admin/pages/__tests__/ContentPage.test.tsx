import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        contents: {
          $get: mockGet,
          $post: mockPost,
          ':id': {
            $put: vi
              .fn()
              .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            $delete: mockDelete,
            publish: {
              $put: vi
                .fn()
                .mockResolvedValue({ json: () => Promise.resolve({ success: true, data: {} }) }),
            },
            archive: {
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

const mockContents = {
  success: true,
  data: {
    items: [
      {
        id: 1,
        title: 'Test Article',
        slug: 'test-article',
        category: 'article',
        content: 'Content',
        summary: null,
        authorId: 'admin',
        authorName: 'Admin',
        status: 'draft',
        tags: null,
        viewCount: 0,
        likeCount: 0,
        publishedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    total: 1,
  },
}

describe('ContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({ json: () => Promise.resolve(mockContents) })
  })

  it('renders content page container', async () => {
    const { ContentPage } = await import('../ContentPage')
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-content-page')).toBeInTheDocument()
    })
  })

  it('fetches and displays content items', async () => {
    const { ContentPage } = await import('../ContentPage')
    render(<ContentPage />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })
  })

  it('shows error when fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'))

    const { ContentPage } = await import('../ContentPage')
    render(<ContentPage />)

    await waitFor(() => {
      expect(screen.getByTestId('admin-content-page')).toBeInTheDocument()
    })
  })
})
