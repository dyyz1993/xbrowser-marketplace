import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationStore } from '../notificationStore'
import type { AppNotification } from '@shared/schemas'

vi.mock('@client/services/apiClient', () => ({
  apiClient: {
    api: {
      notifications: {
        $get: vi.fn(),
        $post: vi.fn(),
        ':id': {
          read: { $patch: vi.fn() },
          $delete: vi.fn(),
        },
        'read-all': { $patch: vi.fn() },
        'unread-count': { $get: vi.fn() },
        stream: {},
      },
    },
  },
}))

vi.mock('@shared/utils/sse-route-helpers', () => ({
  createSSEClientFromRoute: vi.fn(),
}))

const { apiClient } = await import('@client/services/apiClient')

function mockNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'noti-1',
    type: 'info',
    title: 'Test',
    message: 'Test message',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('notificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      sseConnected: false,
    })
  })

  it('should have correct initial state', () => {
    const state = useNotificationStore.getState()
    expect(state.notifications).toEqual([])
    expect(state.unreadCount).toBe(0)
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.sseConnected).toBe(false)
  })

  it('should fetch notifications successfully', async () => {
    const items = [mockNotification(), mockNotification({ id: 'noti-2' })]
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { items } }),
    })

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(2)
    expect(state.loading).toBe(false)
  })

  it('should handle fetch error', async () => {
    ;(apiClient.api.notifications.$get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    )

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
  })

  it('should create notification and increment unread count', async () => {
    const newNoti = mockNotification()
    ;(apiClient.api.notifications.$post as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: newNoti }),
    })

    await useNotificationStore.getState().createNotification({
      type: 'info',
      title: 'Test',
      message: 'Test message',
    })

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
  })

  it('should mark notification as read and decrement unread', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications[':id'].read.$patch as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        json: () => Promise.resolve({ success: true }),
      }
    )

    await useNotificationStore.getState().markAsRead('noti-1')

    const state = useNotificationStore.getState()
    expect(state.notifications[0].read).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('should mark all as read', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification(), mockNotification({ id: 'noti-2', read: true })],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications['read-all'].$patch as ReturnType<typeof vi.fn>).mockResolvedValue(
      {
        json: () => Promise.resolve({ success: true }),
      }
    )

    await useNotificationStore.getState().markAllAsRead()

    const state = useNotificationStore.getState()
    expect(state.notifications.every(n => n.read)).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('should delete notification and update unread count if unread', async () => {
    useNotificationStore.setState({
      notifications: [mockNotification()],
      unreadCount: 1,
    })
    ;(apiClient.api.notifications[':id'].$delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    })

    await useNotificationStore.getState().deleteNotification('noti-1')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(0)
    expect(state.unreadCount).toBe(0)
  })

  it('should fetch unread count', async () => {
    ;(
      apiClient.api.notifications['unread-count'].$get as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: { count: 5 } }),
    })

    await useNotificationStore.getState().fetchUnreadCount()

    expect(useNotificationStore.getState().unreadCount).toBe(5)
  })

  it('should disconnect SSE and reset connected state', async () => {
    await useNotificationStore.getState().connectSSE()
    useNotificationStore.getState().disconnectSSE()
    expect(useNotificationStore.getState().sseConnected).toBe(false)
  })
})
