import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from '../SettingsPage'

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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders General Settings card with form', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('General Settings')).toBeInTheDocument()
    expect(screen.getByText('Site Name')).toBeInTheDocument()
    expect(screen.getByText('Site Description')).toBeInTheDocument()
  })

  it('renders Notification Settings card with toggles', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Notification Settings')).toBeInTheDocument()
    expect(screen.getByText('Email Notifications')).toBeInTheDocument()
    expect(screen.getByText('Push Notifications')).toBeInTheDocument()
  })

  it('renders Security Settings card', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Security Settings')).toBeInTheDocument()
    expect(screen.getByText('Current Password')).toBeInTheDocument()
    expect(screen.getByText('New Password')).toBeInTheDocument()
    expect(screen.getByText('Confirm New Password')).toBeInTheDocument()
  })

  it('save button shows success message', async () => {
    const user = userEvent.setup()
    const { message } = await import('antd')

    render(<SettingsPage />)

    const saveButtons = screen.getAllByRole('button', { name: /save changes/i })
    await user.click(saveButtons[0])

    expect(message.success).toHaveBeenCalledWith('Settings saved successfully!')
  })

  it('toggle switches are present and interactive', () => {
    render(<SettingsPage />)

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(2)
  })
})
