import { useEffect, useState, useCallback } from 'react'
import { pluginAdminApi } from '../../services/plugin-admin-api'
import { Table, Button, Space, Select, Popconfirm, message, Card } from 'antd'
import { RefreshCw } from 'lucide-react'
import type { PluginItem } from './types'
import { getColumns } from './components/Columns'
import { ExpandedRow } from './components/ExpandedRow'
import { DetailModal } from './components/DetailModal'
import { RejectModal } from './components/RejectModal'

export const PluginReviewPage: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [detailPlugin, setDetailPlugin] = useState<PluginItem | null>(null)
  const [rejectModal, setRejectModal] = useState<{ slug: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true)
      const result = await pluginAdminApi.getPending(statusFilter, page, 20)
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
  }, [statusFilter, page])

  useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const handleApprove = async (slug: string) => {
    try {
      const result = await pluginAdminApi.approve(slug)
      if (result.success) {
        message.success(`Approved: ${slug}`)
        fetchPlugins()
      }
    } catch {
      message.error('Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setRejectLoading(true)
    try {
      const result = await pluginAdminApi.reject(rejectModal.slug, rejectReason || 'Not specified')
      if (result.success) {
        message.success(`Rejected: ${rejectModal.slug}`)
        setRejectModal(null)
        setRejectReason('')
        fetchPlugins()
      }
    } catch {
      message.error('Failed to reject')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleBulkApprove = async () => {
    try {
      const slugs = selectedRowKeys.map(key => {
        const plugin = plugins.find(p => p.id === key)
        return plugin!.slug
      })
      const result = await pluginAdminApi.bulkApprove(slugs)
      if (result.success) {
        const data = result.data as { approved: number }
        message.success(`Approved ${data.approved} plugins`)
        setSelectedRowKeys([])
        fetchPlugins()
      }
    } catch {
      message.error('Bulk approve failed')
    }
  }

  const handleBulkReject = async () => {
    try {
      const slugs = selectedRowKeys.map(key => {
        const plugin = plugins.find(p => p.id === key)
        return plugin!.slug
      })
      const result = await pluginAdminApi.bulkReject(slugs)
      if (result.success) {
        const data = result.data as { rejected: number }
        message.success(`Rejected ${data.rejected} plugins`)
        setSelectedRowKeys([])
        fetchPlugins()
      }
    } catch {
      message.error('Bulk reject failed')
    }
  }

  const columns = getColumns(
    record => setDetailPlugin(record),
    handleApprove,
    record => setRejectModal({ slug: record.slug, name: record.name }),
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plugin Review</h1>
        <Space>
          <Select
            value={statusFilter}
            onChange={val => {
              setStatusFilter(val)
              setPage(1)
            }}
            style={{ width: 140 }}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'all', label: 'All' },
            ]}
          />
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchPlugins}>
            Refresh
          </Button>
        </Space>
      </div>

      {selectedRowKeys.length > 0 && (
        <Card size="small" className="mb-4">
          <Space>
            <span>{selectedRowKeys.length} selected</span>
            <Button type="primary" size="small" onClick={handleBulkApprove}>
              Bulk Approve
            </Button>
            <Popconfirm
              title={`Reject ${selectedRowKeys.length} plugins?`}
              onConfirm={handleBulkReject}
            >
              <Button danger size="small">
                Bulk Reject
              </Button>
            </Popconfirm>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>
              Clear
            </Button>
          </Space>
        </Card>
      )}

      <Table
        dataSource={plugins}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: keys => setSelectedRowKeys(keys as string[]),
          getCheckboxProps: (record: PluginItem) => ({
            disabled: record.status !== 'pending',
          }),
        }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: p => setPage(p),
          showTotal: t => `Total ${t}`,
        }}
        expandable={{
          expandedRowRender: (record: PluginItem) => <ExpandedRow record={record} />,
        }}
      />

      <DetailModal plugin={detailPlugin} onClose={() => setDetailPlugin(null)} />

      <RejectModal
        target={rejectModal}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal(null)
          setRejectReason('')
        }}
        loading={rejectLoading}
      />
    </div>
  )
}
