import { Card, Row, Col, Statistic, Table, Tag, Spin, Alert } from 'antd'
import { useEffect, useState } from 'react'
import {
  Activity,
  Package,
  ShoppingCart,
  Ticket,
  AlertTriangle,
  Database,
  Clock,
  Users,
} from 'lucide-react'
import { apiClient } from '../services/apiClient'

interface MonitorStats {
  totalUsers: number
  totalPlugins: number
  totalOrders: number
  totalTickets: number
  totalDisputes: number
  totalContents: number
  pendingPlugins: number
  openTickets: number
  pendingOrders: number
}

interface RecentActivityEntry {
  id: string | number
  type: 'plugin' | 'order' | 'ticket' | 'dispute' | 'user'
  title: string
  status: string
  createdAt: string
}

interface HealthInfo {
  database: 'connected' | 'disconnected'
  uptime: number
}

const typeColors: Record<string, string> = {
  plugin: 'blue',
  order: 'green',
  ticket: 'orange',
  dispute: 'red',
  user: 'purple',
}

const statusColors: Record<string, string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  open: 'blue',
  in_progress: 'processing',
  resolved: 'green',
  closed: 'default',
  completed: 'green',
  cancelled: 'red',
  investigating: 'purple',
}

const activityColumns = [
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    render: (type: string) => <Tag color={typeColors[type] || 'default'}>{type}</Tag>,
  },
  { title: 'Title', dataIndex: 'title', key: 'title' },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => <Tag color={statusColors[status] || 'default'}>{status}</Tag>,
  },
  {
    title: 'Time',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (t: string) => new Date(t).toLocaleString(),
  },
]

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const MonitorPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<MonitorStats | null>(null)
  const [activity, setActivity] = useState<RecentActivityEntry[]>([])
  const [health, setHealth] = useState<HealthInfo | null>(null)

  useEffect(() => {
    fetchMonitorData()
    const interval = setInterval(fetchMonitorData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMonitorData = async () => {
    try {
      const response = await apiClient.api.admin.monitor.$get()
      const result = await response.json()
      if (result.success) {
        setStats(result.data.stats)
        setActivity(result.data.recentActivity)
        setHealth(result.data.health)
        setError(null)
      } else {
        setError(result.error || 'Failed to load monitor data')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20" data-testid="monitor-container">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="monitor-container">
        <Alert type="error" message={error} />
      </div>
    )
  }

  return (
    <div data-testid="monitor-container">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">系统监控</h1>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              prefix={<Users className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Total Plugins"
              value={stats?.totalPlugins ?? 0}
              prefix={<Package className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={stats?.totalOrders ?? 0}
              prefix={<ShoppingCart className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Open Tickets"
              value={stats?.openTickets ?? 0}
              prefix={<Ticket className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Pending Plugins"
              value={stats?.pendingPlugins ?? 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<AlertTriangle className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Pending Orders"
              value={stats?.pendingOrders ?? 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ShoppingCart className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Database"
              value={health?.database === 'connected' ? 'Connected' : 'Disconnected'}
              valueStyle={{ color: health?.database === 'connected' ? '#52c41a' : '#ff4d4f' }}
              prefix={<Database className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={6}>
          <Card>
            <Statistic
              title="Uptime"
              value={health ? formatUptime(health.uptime) : '-'}
              prefix={<Clock className="w-5 h-5 inline" />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Activity">
        <Table
          dataSource={activity}
          columns={activityColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
