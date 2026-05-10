import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'
import type { SystemStats } from '@shared/modules/admin'
import type { NotificationType } from '@shared/schemas'
import {
  CheckCircle,
  Clock,
  Bell,
  BellRing,
  Package,
  Download,
  Users,
  Eye,
  Star,
  AlertCircle,
} from 'lucide-react'
import { Button, Select, message } from 'antd'

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingNotification, setSendingNotification] = useState(false)
  const [notificationType, setNotificationType] = useState<NotificationType>('info')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.api.admin.stats.$get()
        const result = await response.json()
        if (result.success) {
          setStats(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleSendTestNotification = async () => {
    setSendingNotification(true)
    try {
      const response = await apiClient.api.admin.notifications.test.$post({
        json: { type: notificationType },
      })
      const result = await response.json()
      if (result.success) {
        message.success(`测试通知已发送 (${notificationType})`)
      } else {
        message.error('发送失败')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
      message.error('发送失败')
    } finally {
      setSendingNotification(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const marketplaceCards = [
    {
      title: 'Total Plugins',
      value: stats?.totalPlugins ?? 0,
      icon: Package,
      color: 'bg-blue-500',
      detail: `${stats?.approvedPlugins ?? 0} approved, ${stats?.pendingPlugins ?? 0} pending`,
    },
    {
      title: 'Total Downloads',
      value: stats?.totalDownloads ?? 0,
      icon: Download,
      color: 'bg-green-500',
      detail: `${stats?.totalViews ?? 0} total views`,
    },
    {
      title: 'Active Developers',
      value: stats?.activeDevelopers ?? 0,
      icon: Users,
      color: 'bg-purple-500',
      detail: `${stats?.rejectedPlugins ?? 0} rejected plugins`,
    },
    {
      title: 'Total Reviews',
      value: stats?.totalReviews ?? 0,
      icon: Star,
      color: 'bg-yellow-500',
      detail: `Across all plugins`,
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {marketplaceCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{card.detail}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plugin Status Overview</h2>
          <div className="space-y-3">
            {[
              {
                label: 'Approved',
                count: stats?.approvedPlugins ?? 0,
                color: 'bg-green-500',
                icon: CheckCircle,
              },
              {
                label: 'Pending Review',
                count: stats?.pendingPlugins ?? 0,
                color: 'bg-yellow-500',
                icon: Clock,
              },
              {
                label: 'Rejected',
                count: stats?.rejectedPlugins ?? 0,
                color: 'bg-red-500',
                icon: AlertCircle,
              },
            ].map((item, i) => {
              const total = stats?.totalPlugins ?? 1
              const pct = Math.round((item.count / total) * 100)
              const ItemIcon = item.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <ItemIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 w-28">{item.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {item.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Platform Summary</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total Views</p>
              <p className="text-xl font-bold text-gray-900">
                {(stats?.totalViews ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Avg Downloads/Plugin</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.totalPlugins
                  ? Math.round((stats.totalDownloads ?? 0) / stats.totalPlugins)
                  : 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Reviews/Plugin</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.totalPlugins
                  ? ((stats.totalReviews ?? 0) / stats.totalPlugins).toFixed(1)
                  : '0'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Approval Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {stats?.totalPlugins
                  ? `${Math.round(((stats.approvedPlugins ?? 0) / stats.totalPlugins) * 100)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <BellRing className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">测试通知功能</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          发送测试通知到所有已连接的客户端。error 和 warning 类型的通知会弹出 antd
          notification，info 和 success 类型只会出现在铃铛列表中。
        </p>
        <div className="flex items-center gap-4">
          <Select
            value={notificationType}
            onChange={setNotificationType}
            style={{ width: 120 }}
            options={[
              { value: 'info', label: 'Info' },
              { value: 'success', label: 'Success' },
              { value: 'warning', label: 'Warning' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <Button
            type="primary"
            icon={<Bell className="w-4 h-4" />}
            loading={sendingNotification}
            onClick={handleSendTestNotification}
          >
            发送测试通知
          </Button>
        </div>
      </div>
    </div>
  )
}
