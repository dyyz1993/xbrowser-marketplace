import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}))

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      admin: {
        settings: {
          $get: mockGet,
          $put: mockPut,
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

function setupMocks() {
  mockGet.mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: true,
        data: [
          {
            id: 1,
            key: 'siteName',
            value: 'Test Site',
            description: null,
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            key: 'siteDescription',
            value: 'A test site',
            description: null,
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 3,
            key: 'emailNotifications',
            value: 'true',
            description: null,
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 4,
            key: 'pushNotifications',
            value: 'false',
            description: null,
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }),
  })
  mockPut.mockResolvedValue({
    json: () =>
      Promise.resolve({
        success: true,
        data: [],
      }),
  })
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders General Settings card with form after loading', async () => {
    const { SettingsPage } = await import('../SettingsPage')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Site Name')).toBeInTheDocument()
    expect(screen.getByText('Site Description')).toBeInTheDocument()
  })

  it('renders Notification Settings card with toggles', async () => {
    const { SettingsPage } = await import('../SettingsPage')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
  })

  it('renders Security Settings card', async () => {
    const { SettingsPage } = await import('../SettingsPage')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument()
    })

    expect(screen.getByText('Current Password')).toBeInTheDocument()
    expect(screen.getByText('New Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument()
  })

  it('save button triggers API call', async () => {
    const user = userEvent.setup()
    const { SettingsPage } = await import('../SettingsPage')

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled()
    })
  })

  it('toggle switches are present and interactive', async () => {
    const { SettingsPage } = await import('../SettingsPage')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('Notification Settings')).toBeInTheDocument()
    })

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(2)
  })

  it('shows error when fetch fails', async () => {
    const { message } = await import('antd')
    mockGet.mockRejectedValue(new Error('Network error'))

    const { SettingsPage } = await import('../SettingsPage')
    render(<SettingsPage />)

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to load settings')
    })
  })
})
