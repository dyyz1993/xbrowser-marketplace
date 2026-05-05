import { useEffect, useState } from 'react'
import { pluginAdminApi } from '../services/plugin-admin-api'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
} from 'antd'
import {
  CheckCircle,
  Clock,
  Download,
  Users,
  Star,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DashboardData {
  totalPlugins: number
  pendingPlugins: number
  approvedPlugins: number
  totalDownloads: number
  activeDevelopers: number
  recentSubmissions: Array<{
    id: string
    name: string
    slug: string
    authorName: string
    status: string
    createdAt: number
    featured: boolean
  }>
}

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

const statusLabelMap: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const PluginDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const result = await pluginAdminApi.getDashboard()
      if (result.success) {
        setDashboard(result.data as DashboardData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickApprove = async (slug: string) => {
    try {
      const result = await pluginAdminApi.approve(slug)
      if (result.success) {
        message.success(`Approved ${slug}`)
        fetchDashboard()
      }
    } catch {
      message.error('Failed to approve')
    }
  }

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Plugins',
      value: dashboard.totalPlugins,
      icon: Star,
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Reviews',
      value: dashboard.pendingPlugins,
      icon: Clock,
      color: 'bg-orange-500',
    },
    {
      title: 'Total Downloads',
      value: dashboard.totalDownloads,
      icon: Download,
      color: 'bg-green-500',
    },
    {
      title: 'Active Developers',
      value: dashboard.activeDevelopers,
      icon: Users,
      color: 'bg-purple-500',
    },
  ]

  const columns = [
    {
      title: 'Plugin',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DashboardData['recentSubmissions'][0]) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-400">{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Author',
      dataIndex: 'authorName',
      key: 'authorName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusLabelMap[status] || status}</Tag>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => new Date(ts).toLocaleDateString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: DashboardData['recentSubmissions'][0]) =>
        record.status === 'pending' ? (
          <Space>
            <Popconfirm title={`Approve ${record.name}?`} onConfirm={() => handleQuickApprove(record.slug)}>
              <Button type="primary" size="small" icon={<CheckCircle className="w-3 h-3" />}>
                Approve
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <span className="text-gray-400 text-sm">—</span>
        ),
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Plugin Marketplace Dashboard</h1>

      <Row gutter={[16, 16]} className="mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <Statistic title={card.title} value={card.value} />
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Card
        title="Recent Submissions"
        extra={
          <Button
            type="link"
            icon={<ArrowRight className="w-4 h-4" />}
            onClick={() => navigate('/plugins/review')}
          >
            View All
          </Button>
        }
      >
        <Table
          dataSource={dashboard.recentSubmissions}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
