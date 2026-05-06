import { Send } from 'lucide-react'
import { LoadingSpinner } from '@client/components'
import type { NotificationType } from '@shared/schemas'

interface NotificationFormProps {
  title: string
  message: string
  type: NotificationType
  loading: boolean
  onTitleChange: (value: string) => void
  onMessageChange: (value: string) => void
  onTypeChange: (value: NotificationType) => void
  onSubmit: (e: React.FormEvent) => void
}

export const NotificationForm: React.FC<NotificationFormProps> = ({
  title,
  message,
  type,
  loading,
  onTitleChange,
  onMessageChange,
  onTypeChange,
  onSubmit,
}) => (
  <form onSubmit={onSubmit} className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="flex gap-4 mb-4">
      <select
        value={type}
        onChange={e => onTypeChange(e.target.value as NotificationType)}
        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        data-testid="notification-type-select"
      >
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
      </select>
      <input
        type="text"
        value={title}
        onChange={e => onTitleChange(e.target.value)}
        placeholder="Title..."
        className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
        data-testid="notification-title-input"
      />
    </div>
    <div className="mb-4">
      <textarea
        value={message}
        onChange={e => onMessageChange(e.target.value)}
        placeholder="Message..."
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none min-h-[100px]"
        data-testid="notification-message-input"
      />
    </div>
    <button
      type="submit"
      disabled={!title.trim() || !message.trim() || loading}
      className="flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      data-testid="create-notification-button"
    >
      {loading ? <LoadingSpinner size="sm" color="text-white" /> : <Send className="w-5 h-5" />}
      Create Notification
    </button>
  </form>
)
