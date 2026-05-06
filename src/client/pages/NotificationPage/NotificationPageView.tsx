import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { EmptyState } from '@client/components'
import type { NotificationType } from '@shared/schemas'
import { SSEStatusBar } from './SSEStatusBar'
import { NotificationForm } from './NotificationForm'
import { NotificationListItem } from './NotificationListItem'

export const NotificationPage: React.FC = () => {
  const notifications = useNotificationStore(state => state.notifications)
  const unreadCount = useNotificationStore(state => state.unreadCount)
  const sseConnected = useNotificationStore(state => state.sseConnected)
  const loading = useNotificationStore(state => state.loading)
  const error = useNotificationStore(state => state.error)
  const {
    fetchNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    connectSSE,
    disconnectSSE,
  } = useNotificationStore()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('info')

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    await createNotification({ type, title, message })
    setTitle('')
    setMessage('')
  }

  return (
    <div className="max-w-3xl mx-auto p-6" data-testid="notification-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-8 h-8 text-purple-500" />
          Notifications
        </h1>
        <p className="text-gray-500 mt-2">
          Demonstrates SSE (Server-Sent Events) with Hono RPC type inference
        </p>
      </div>

      <SSEStatusBar
        sseConnected={sseConnected}
        unreadCount={unreadCount}
        onConnect={connectSSE}
        onDisconnect={disconnectSSE}
        onMarkAllRead={markAllAsRead}
      />

      <NotificationForm
        title={title}
        message={message}
        type={type}
        loading={loading}
        onTitleChange={setTitle}
        onMessageChange={setMessage}
        onTypeChange={setType}
        onSubmit={handleCreate}
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {notifications.map(notification => (
          <NotificationListItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        ))}
      </div>

      {!loading && notifications.length === 0 && (
        <EmptyState icon={Bell} title="No notifications yet. Create one above!" className="py-12" />
      )}
    </div>
  )
}
