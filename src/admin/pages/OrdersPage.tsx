import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../services/apiClient'
import { Table, Tag, Button, Input, Select, Modal, Space, message } from 'antd'
import { Search, Eye, Play, CheckCircle, XCircle } from 'lucide-react'

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  processing: 'blue',
  completed: 'green',
  cancelled: 'red',
  disputed: 'purple',
}

const statusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  completed: '已完成',
  cancelled: '已取消',
  disputed: '有争议',
}

interface OrderItem {
  id: number
  orderNo: string
  userId: string
  customerName: string
  customerEmail: string
  productName: string
  amount: number
  status: string
  paymentMethod: string | null
  transactionId: string | null
  createdAt: number
  updatedAt: number
}

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const query: Record<string, string> = { page: String(page), limit: '20' }
      if (statusFilter) query.status = statusFilter
      if (search) query.search = search
      const response = await apiClient.api.admin.orders.$get({ query })
      const result = await response.json()
      if (result.success) {
        setOrders((result.data as { items: OrderItem[]; total: number }).items)
        setTotal((result.data as { items: OrderItem[]; total: number }).total)
      }
    } catch {
      message.error('获取订单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleAction = async (id: number, action: 'process' | 'cancel' | 'complete') => {
    try {
      const response = await apiClient.api.admin.orders[':id'][action].$put({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('操作成功')
        fetchOrders()
      } else {
        message.error((result as { error?: string }).error || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleViewDetail = async (id: number) => {
    try {
      const response = await apiClient.api.admin.orders[':id'].$get({ param: { id: String(id) } })
      const result = await response.json()
      if (result.success) setDetailOrder(result.data as OrderItem)
    } catch {
      message.error('获取详情失败')
    }
  }

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo', width: 180 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName' },
    {
      title: '产品',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${(amount / 100).toFixed(2)}`,
      sorter: (a: OrderItem, b: OrderItem) => a.amount - b.amount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (ts: number) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: (_: unknown, record: OrderItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => handleViewDetail(record.id)}
          />
          {record.status === 'pending' && (
            <Button
              size="small"
              type="primary"
              icon={<Play className="w-3 h-3" />}
              onClick={() => handleAction(record.id, 'process')}
            >
              处理
            </Button>
          )}
          {record.status === 'processing' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircle className="w-3 h-3" />}
              onClick={() => handleAction(record.id, 'complete')}
            >
              完成
            </Button>
          )}
          {(record.status === 'pending' || record.status === 'processing') && (
            <Button
              size="small"
              danger
              icon={<XCircle className="w-3 h-3" />}
              onClick={() => handleAction(record.id, 'cancel')}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="admin-orders-page">
      <div className="mb-4 flex gap-4 items-center">
        <Input
          placeholder="搜索客户名称/邮箱"
          prefix={<Search className="w-4 h-4" />}
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={val => {
            setStatusFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 150 }}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: t => `共 ${t} 条`,
        }}
      />

      <Modal
        title="订单详情"
        open={!!detailOrder}
        onCancel={() => setDetailOrder(null)}
        footer={null}
        width={600}
      >
        {detailOrder && (
          <div className="space-y-3">
            <div>
              <strong>订单号:</strong> {detailOrder.orderNo}
            </div>
            <div>
              <strong>客户:</strong> {detailOrder.customerName} ({detailOrder.customerEmail})
            </div>
            <div>
              <strong>产品:</strong> {detailOrder.productName}
            </div>
            <div>
              <strong>金额:</strong> ¥{(detailOrder.amount / 100).toFixed(2)}
            </div>
            <div>
              <strong>状态:</strong>{' '}
              <Tag color={statusColorMap[detailOrder.status]}>
                {statusLabels[detailOrder.status]}
              </Tag>
            </div>
            {detailOrder.paymentMethod && (
              <div>
                <strong>支付方式:</strong> {detailOrder.paymentMethod}
              </div>
            )}
            {detailOrder.transactionId && (
              <div>
                <strong>交易号:</strong> {detailOrder.transactionId}
              </div>
            )}
            <div>
              <strong>创建时间:</strong>{' '}
              {detailOrder.createdAt
                ? new Date(detailOrder.createdAt).toLocaleString('zh-CN')
                : '-'}
            </div>
            <div>
              <strong>更新时间:</strong>{' '}
              {detailOrder.updatedAt
                ? new Date(detailOrder.updatedAt).toLocaleString('zh-CN')
                : '-'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
