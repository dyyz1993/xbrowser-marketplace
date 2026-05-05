import { useEffect, useState, useCallback } from 'react'
import { pluginAdminApi } from '../services/plugin-admin-api'
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Popconfirm,
  message,
} from 'antd'
import { Search, Trash2, Star, RefreshCw } from 'lucide-react'

interface PluginItem {
  id: string
  name: string
  slug: string
  description: string
  authorName: string
  version: string
  status: string
  downloadCount: number
  viewCount: number
  featured: boolean
  tags: string[]
  createdAt: number
}

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

export const PluginManagementPage: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true)
      const result = await pluginAdminApi.listAllPlugins({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      })
      if (result.success) {
        const data = result.data as { items: PluginItem[]; total: number }
        setPlugins(data.items)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const handleToggleFeatured = async (slug: string, currentFeatured: boolean) => {
    try {
      const result = await pluginAdminApi.toggleFeatured(slug)
      if (result.success) {
        message.success(currentFeatured ? 'Unfeatured' : 'Featured')
        fetchPlugins()
      }
    } catch {
      message.error('Failed to toggle featured')
    }
  }

  const handleRemove = async (slug: string) => {
    try {
      const result = await pluginAdminApi.remove(slug)
      if (result.success) {
        message.success(`Removed: ${slug}`)
        fetchPlugins()
      }
    } catch {
      message.error('Failed to remove')
    }
  }

  const columns = [
    {
      title: 'Plugin',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PluginItem) => (
        <div>
          <div className="font-medium flex items-center gap-2">
            {name}
            {record.featured && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
          </div>
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
        <Tag color={statusColorMap[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Downloads',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      sorter: (a: PluginItem, b: PluginItem) => a.downloadCount - b.downloadCount,
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
    },
    {
      title: 'Featured',
      dataIndex: 'featured',
      key: 'featured',
      render: (featured: boolean, record: PluginItem) => (
        record.status === 'approved' ? (
          <Button
            type="text"
            size="small"
            icon={
              <Star
                className={`w-4 h-4 ${featured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
              />
            }
            onClick={() => handleToggleFeatured(record.slug, featured)}
          />
        ) : (
          <span className="text-gray-300">—</span>
        )
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => new Date(ts).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: PluginItem) => (
        <Popconfirm
          title={`Remove "${record.name}"?`}
          description="This will mark the plugin as removed."
          onConfirm={() => handleRemove(record.slug)}
        >
          <Button danger size="small" icon={<Trash2 className="w-3 h-3" />}>
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Plugin Management</h1>

      <div className="flex items-center gap-3 mb-4">
        <Input
          placeholder="Search plugins..."
          prefix={<Search className="w-4 h-4 text-gray-400" />}
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
          style={{ width: 300 }}
          allowClear
        />
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={val => {
            setStatusFilter(val)
            setPage(1)
          }}
          style={{ width: 120 }}
          allowClear
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchPlugins}>
          Refresh
        </Button>
      </div>

      <Table
        dataSource={plugins}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: p => setPage(p),
          showTotal: t => `Total ${t}`,
        }}
      />
    </div>
  )
}
