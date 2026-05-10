import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../services/apiClient'
import { Table, Tag, Button, Select, Modal, Space, message, Input, Form } from 'antd'
import { Eye, CheckCircle, XCircle } from 'lucide-react'

const statusColorMap: Record<string, string> = {
  pending: 'orange',
  investigating: 'blue',
  resolved: 'green',
  rejected: 'red',
}

const typeLabels: Record<string, string> = {
  refund: '退款',
  product_quality: '产品质量',
  service_quality: '服务质量',
  delivery: '配送问题',
  other: '其他',
}

interface DisputeItem {
  id: number
  disputeNo: string
  orderId: number
  userId: string
  customerName: string
  customerEmail: string
  type: string
  status: string
  description: string
  resolution: string | null
  amount: number
  resolvedAt: number | null
  resolvedBy: string | null
  createdAt: number
  updatedAt: number
}

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<DisputeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined)
  const [detailDispute, setDetailDispute] = useState<DisputeItem | null>(null)
  const [resolveModal, setResolveModal] = useState<DisputeItem | null>(null)
  const [rejectModal, setRejectModal] = useState<DisputeItem | null>(null)
  const [resolveForm] = Form.useForm<{ resolution: string }>()
  const [rejectForm] = Form.useForm<{ reason: string }>()

  const fetchDisputes = useCallback(async () => {
    try {
      setLoading(true)
      const query: Record<string, string> = { page: String(page), limit: '20' }
      if (statusFilter) query.status = statusFilter
      if (typeFilter) query.type = typeFilter
      const response = await apiClient.api.admin.disputes.$get({ query })
      const result = await response.json()
      if (result.success) {
        setDisputes((result.data as { items: DisputeItem[]; total: number }).items)
        setTotal((result.data as { items: DisputeItem[]; total: number }).total)
      }
    } catch {
      message.error('获取争议列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, typeFilter])

  useEffect(() => {
    fetchDisputes()
  }, [fetchDisputes])

  const handleViewDetail = async (id: number) => {
    try {
      const response = await apiClient.api.admin.disputes[':id'].$get({ param: { id: String(id) } })
      const result = await response.json()
      if (result.success) setDetailDispute(result.data as DisputeItem)
    } catch {
      message.error('获取详情失败')
    }
  }

  const handleResolve = async () => {
    if (!resolveModal) return
    try {
      const values = await resolveForm.validateFields()
      const response = await apiClient.api.admin.disputes[':id'].resolve.$put({
        param: { id: String(resolveModal.id) },
        json: { resolution: values.resolution, resolvedBy: '管理员' },
      })
      const result = await response.json()
      if (result.success) {
        message.success('争议已解决')
        setResolveModal(null)
        resolveForm.resetFields()
        fetchDisputes()
      }
    } catch {
      message.error('操作失败')
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try {
      const values = await rejectForm.validateFields()
      const response = await apiClient.api.admin.disputes[':id'].reject.$put({
        param: { id: String(rejectModal.id) },
        json: { reason: values.reason, rejectedBy: '管理员' },
      })
      const result = await response.json()
      if (result.success) {
        message.success('争议已驳回')
        setRejectModal(null)
        rejectForm.resetFields()
        fetchDisputes()
      }
    } catch {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: '争议号', dataIndex: 'disputeNo', key: 'disputeNo', width: 160 },
    { title: '订单ID', dataIndex: 'orderId', key: 'orderId', width: 80 },
    { title: '客户', dataIndex: 'customerName', key: 'customerName' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => typeLabels[type] || type,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${(amount / 100).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={statusColorMap[status]}>{status}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: unknown, record: DisputeItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => handleViewDetail(record.id)}
          />
          {(record.status === 'pending' || record.status === 'investigating') && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircle className="w-3 h-3" />}
                onClick={() => setResolveModal(record)}
              >
                解决
              </Button>
              <Button
                size="small"
                danger
                icon={<XCircle className="w-3 h-3" />}
                onClick={() => setRejectModal(record)}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="admin-disputes-page">
      <div className="mb-4 flex gap-4 items-center">
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={val => {
            setStatusFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 150 }}
          options={['pending', 'investigating', 'resolved', 'rejected'].map(s => ({
            value: s,
            label: s,
          }))}
        />
        <Select
          placeholder="类型筛选"
          value={typeFilter}
          onChange={val => {
            setTypeFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 150 }}
          options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <Table
        dataSource={disputes}
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
        title="争议详情"
        open={!!detailDispute}
        onCancel={() => setDetailDispute(null)}
        footer={null}
        width={600}
      >
        {detailDispute && (
          <div className="space-y-3">
            <div>
              <strong>争议号:</strong> {detailDispute.disputeNo}
            </div>
            <div>
              <strong>订单ID:</strong> {detailDispute.orderId}
            </div>
            <div>
              <strong>客户:</strong> {detailDispute.customerName} ({detailDispute.customerEmail})
            </div>
            <div>
              <strong>类型:</strong> {typeLabels[detailDispute.type] || detailDispute.type}
            </div>
            <div>
              <strong>金额:</strong> ¥{(detailDispute.amount / 100).toFixed(2)}
            </div>
            <div>
              <strong>状态:</strong>{' '}
              <Tag color={statusColorMap[detailDispute.status]}>{detailDispute.status}</Tag>
            </div>
            <div>
              <strong>描述:</strong> {detailDispute.description}
            </div>
            {detailDispute.resolution && (
              <div>
                <strong>处理结果:</strong> {detailDispute.resolution}
              </div>
            )}
            {detailDispute.resolvedBy && (
              <div>
                <strong>处理人:</strong> {detailDispute.resolvedBy}
              </div>
            )}
            {detailDispute.resolvedAt && (
              <div>
                <strong>处理时间:</strong>{' '}
                {new Date(detailDispute.resolvedAt).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={`解决争议 - ${resolveModal?.disputeNo || ''}`}
        open={!!resolveModal}
        onOk={handleResolve}
        onCancel={() => {
          setResolveModal(null)
          resolveForm.resetFields()
        }}
      >
        <Form form={resolveForm} layout="vertical">
          <Form.Item
            name="resolution"
            label="解决方案"
            rules={[{ required: true, message: '请输入解决方案' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`驳回争议 - ${rejectModal?.disputeNo || ''}`}
        open={!!rejectModal}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal(null)
          rejectForm.resetFields()
        }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="驳回原因"
            rules={[{ required: true, message: '请输入驳回原因' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
