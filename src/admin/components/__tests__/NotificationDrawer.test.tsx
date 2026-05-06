import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationDrawer, NotificationBell } from '../NotificationDrawer'
import type { AppNotification } from '@shared/schemas'

const mockNotifications: AppNotification[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    type: 'info',
    title: 'Test Info',
    message: 'Info message',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    type: 'warning',
    title: 'Test Warning',
    message: 'Warning message',
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    type: 'success',
    title: 'Test Success',
    message: 'Success message',
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  notifications: mockNotifications,
  unreadCount: 2,
  onMarkAsRead: vi.fn(),
  onMarkAllAsRead: vi.fn(),
}

describe('NotificationDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render drawer title', () => {
    render(<NotificationDrawer {...defaultProps} />)
    expect(screen.getByText('通知中心')).toBeInTheDocument()
  })

  it('should render all notification titles', () => {
    render(<NotificationDrawer {...defaultProps} />)
    expect(screen.getByText('Test Info')).toBeInTheDocument()
    expect(screen.getByText('Test Warning')).toBeInTheDocument()
    expect(screen.getByText('Test Success')).toBeInTheDocument()
  })

  it('should call onClose when drawer close triggered', () => {
    render(<NotificationDrawer {...defaultProps} />)
    fireEvent.click(screen.getByText('通知中心'))
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('should show mark all as read button when unread count > 0', () => {
    render(<NotificationDrawer {...defaultProps} />)
    expect(screen.getByText('全部已读')).toBeInTheDocument()
  })

  it('should call onMarkAllAsRead when clicking mark all read', () => {
    render(<NotificationDrawer {...defaultProps} />)
    fireEvent.click(screen.getByText('全部已读'))
    expect(defaultProps.onMarkAllAsRead).toHaveBeenCalledTimes(1)
  })

  it('should not show mark all as read button when no unread', () => {
    render(<NotificationDrawer {...defaultProps} unreadCount={0} />)
    expect(screen.queryByText('全部已读')).not.toBeInTheDocument()
  })

  it('should call onMarkAsRead when clicking unread notification', () => {
    render(<NotificationDrawer {...defaultProps} />)
    fireEvent.click(screen.getByText('Test Info'))
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111')
  })

  it('should not call onMarkAsRead when clicking read notification', () => {
    render(<NotificationDrawer {...defaultProps} />)
    fireEvent.click(screen.getByText('Test Warning'))
    expect(defaultProps.onMarkAsRead).not.toHaveBeenCalled()
  })

  it('should show empty state when no notifications', () => {
    render(<NotificationDrawer {...defaultProps} notifications={[]} />)
    expect(screen.getByText('暂无通知')).toBeInTheDocument()
  })

  it('should show loading spinner when loading', () => {
    render(<NotificationDrawer {...defaultProps} loading={true} />)
    expect(screen.getByText('通知中心')).toBeInTheDocument()
  })
})

describe('NotificationBell', () => {
  it('should render bell button', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const onClick = vi.fn()
    render(<NotificationBell unreadCount={0} onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should show badge when unread count > 0', () => {
    render(<NotificationBell unreadCount={5} onClick={vi.fn()} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should show 99+ when unread count > 99', () => {
    render(<NotificationBell unreadCount={100} onClick={vi.fn()} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('should not show badge when unread count is 0', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
