import { Wifi, WifiOff, CheckCheck } from 'lucide-react'

interface SSEStatusBarProps {
  sseConnected: boolean
  unreadCount: number
  onConnect: () => void
  onDisconnect: () => void
  onMarkAllRead: () => void
}

export const SSEStatusBar: React.FC<SSEStatusBarProps> = ({
  sseConnected,
  unreadCount,
  onConnect,
  onDisconnect,
  onMarkAllRead,
}) => (
  <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">SSE Status:</span>
        {sseConnected ? (
          <span
            className="flex items-center gap-1 text-green-600"
            data-testid="sse-status-connected"
          >
            <Wifi className="w-4 h-4" />
            Connected
          </span>
        ) : (
          <span
            className="flex items-center gap-1 text-red-500"
            data-testid="sse-status-disconnected"
          >
            <WifiOff className="w-4 h-4" />
            Disconnected
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">Unread:</span>
        <span
          className="px-2.5 py-0.5 bg-blue-500 text-white text-sm font-medium rounded-full"
          data-testid="unread-count"
        >
          {unreadCount}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onConnect}
        disabled={sseConnected}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          sseConnected
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
        data-testid="connect-sse-button"
      >
        <Wifi className="w-4 h-4" />
        Connect
      </button>
      <button
        onClick={onDisconnect}
        disabled={!sseConnected}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          !sseConnected
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
        data-testid="disconnect-sse-button"
      >
        <WifiOff className="w-4 h-4" />
        Disconnect
      </button>
      <button
        onClick={onMarkAllRead}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
        data-testid="mark-all-read-button"
      >
        <CheckCheck className="w-4 h-4" />
        Mark All Read
      </button>
    </div>
  </div>
)
