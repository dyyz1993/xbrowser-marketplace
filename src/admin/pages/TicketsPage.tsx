import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../services/apiClient'
import { Table, Tag, Button, Select, Modal, Space, message, Drawer, Input, Form } from 'antd'
import { MessageSquare, XCircle, Eye } from 'lucide-react'

const statusColorMap: Record<string, string> = {
  open: 'orange',
  in_progress: 'blue',
  waiting_customer: 'cyan',
  resolved: 'green',
  closed: 'default',
}

const priorityColorMap: Record<string, string> = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
}

interface TicketItem {
  id: number
  ticketNo: string
  userId: string
  customerName: string
  customerEmail: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  assignedTo: string | null
  createdAt: number
  updatedAt: number
  messages?: TicketMessage[]
}

interface TicketMessage {
  id: number
  ticketId: number
  userId: string
  author: string
  content: string
  isAdmin: boolean
  createdAt: number
}

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined)
  const [detailTicket, setDetailTicket] = useState<TicketItem | null>(null)
  const [replyModal, setReplyModal] = useState<TicketItem | null>(null)
  const [replyForm] = Form.useForm<{ content: string }>()

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      const query: Record<string, string> = { page: String(page), limit: '20' }
      if (statusFilter) query.status = statusFilter
      if (priorityFilter) query.priority = priorityFilter
      const response = await apiClient.api.admin.tickets.$get({ query })
      const result = await response.json()
      if (result.success) {
        setTickets((result.data as { items: TicketItem[]; total: number }).items)
        setTotal((result.data as { items: TicketItem[]; total: number }).total)
      }
    } catch {
      message.error('获取工单列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, priorityFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const handleViewDetail = async (id: number) => {
    try {
      const response = await apiClient.api.admin.tickets[':id'].$get({ param: { id: String(id) } })
      const result = await response.json()
      if (result.success) setDetailTicket(result.data as TicketItem)
    } catch {
      message.error('获取详情失败')
    }
  }

  const handleReply = async () => {
    if (!replyModal) return
    try {
      const values = await replyForm.validateFields()
      const response = await apiClient.api.admin.tickets[':id'].reply.$post({
        param: { id: String(replyModal.id) },
        json: { content: values.content, author: '管理员' },
      })
      const result = await response.json()
      if (result.success) {
        message.success('回复成功')
        setReplyModal(null)
        replyForm.resetFields()
        fetchTickets()
      }
    } catch {
      message.error('回复失败')
    }
  }

  const handleClose = async (id: number) => {
    try {
      const response = await apiClient.api.admin.tickets[':id'].close.$put({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('工单已关闭')
        fetchTickets()
      }
    } catch {
      message.error('操作失败')
    }
  }

  const columns = [
    { title: '工单号', dataIndex: 'ticketNo', key: 'ticketNo', width: 160 },
    { title: '主题', dataIndex: 'subject', key: 'subject', ellipsis: true },
    { title: '客户', dataIndex: 'customerName', key: 'customerName' },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => <Tag color={priorityColorMap[priority]}>{priority}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={statusColorMap[status]}>{status}</Tag>,
    },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
    {
      title: '处理人',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: TicketItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<Eye className="w-3 h-3" />}
            onClick={() => handleViewDetail(record.id)}
          />
          {record.status !== 'closed' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<MessageSquare className="w-3 h-3" />}
                onClick={() => setReplyModal(record)}
              >
                回复
              </Button>
              <Button
                size="small"
                danger
                icon={<XCircle className="w-3 h-3" />}
                onClick={() => handleClose(record.id)}
              >
                关闭
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="admin-tickets-page">
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
          options={['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map(s => ({
            value: s,
            label: s,
          }))}
        />
        <Select
          placeholder="优先级筛选"
          value={priorityFilter}
          onChange={val => {
            setPriorityFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 150 }}
          options={['low', 'medium', 'high', 'urgent'].map(s => ({ value: s, label: s }))}
        />
      </div>

      <Table
        dataSource={tickets}
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

      <Drawer
        title={`工单详情 - ${detailTicket?.ticketNo || ''}`}
        open={!!detailTicket}
        onClose={() => setDetailTicket(null)}
        width={640}
      >
        {detailTicket && (
          <div className="space-y-4">
            <div>
              <strong>主题:</strong> {detailTicket.subject}
            </div>
            <div>
              <strong>客户:</strong> {detailTicket.customerName} ({detailTicket.customerEmail})
            </div>
            <div>
              <strong>描述:</strong> {detailTicket.description}
            </div>
            <div>
              <strong>状态:</strong>{' '}
              <Tag color={statusColorMap[detailTicket.status]}>{detailTicket.status}</Tag>
            </div>
            <div>
              <strong>优先级:</strong>{' '}
              <Tag color={priorityColorMap[detailTicket.priority]}>{detailTicket.priority}</Tag>
            </div>
            <div>
              <strong>分类:</strong> {detailTicket.category}
            </div>
            {detailTicket.assignedTo && (
              <div>
                <strong>处理人:</strong> {detailTicket.assignedTo}
              </div>
            )}
            <hr />
            <h4>消息记录</h4>
            {(detailTicket.messages || []).map(msg => (
              <div
                key={msg.id}
                className={`p-3 rounded ${msg.isAdmin ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {msg.author} ({msg.isAdmin ? '管理员' : '客户'}) -{' '}
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleString('zh-CN') : '-'}
                </div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <Modal
        title={`回复工单 - ${replyModal?.ticketNo || ''}`}
        open={!!replyModal}
        onOk={handleReply}
        onCancel={() => {
          setReplyModal(null)
          replyForm.resetFields()
        }}
      >
        <Form form={replyForm} layout="vertical">
          <Form.Item
            name="content"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
