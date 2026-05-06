import { CheckCheck, Trash2 } from 'lucide-react'
import { StatusBadge } from '@client/components'
import { typeConfig } from './NotificationTypeConfig'
import type { AppNotification } from '@shared/schemas'

interface NotificationListItemProps {
  notification: AppNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const config = typeConfig[notification.type] ?? typeConfig.info
  const TypeIcon = config.icon

  return (
    <div
      className={`p-5 rounded-xl border-l-4 transition-all ${
        notification.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 shadow-sm'
      } ${config.border}`}
      data-testid={notification.read ? 'notification-item-read' : 'notification-item-unread'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge
              label={notification.type.toUpperCase()}
              icon={TypeIcon}
              colorScheme={config.colorScheme}
            />
            <span className="font-medium text-gray-900" data-testid="notification-title">
              {notification.title}
            </span>
          </div>
          <p className="text-gray-600 text-sm" data-testid="notification-message">
            {notification.message}
          </p>
          <span className="text-xs text-gray-400 mt-2 block">
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!notification.read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Mark as read"
              data-testid="mark-as-read-button"
            >
              <CheckCheck className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            data-testid="delete-notification-button"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
