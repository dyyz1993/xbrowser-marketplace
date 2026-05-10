import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '../services/apiClient'
import { Table, Tag, Button, Input, Select, Modal, Space, message, Form, Popconfirm } from 'antd'
import { Search, Plus, Edit, Trash2, Upload, Archive } from 'lucide-react'

const statusColorMap: Record<string, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
}

const categoryLabels: Record<string, string> = {
  article: '文章',
  announcement: '公告',
  tutorial: '教程',
  news: '新闻',
  policy: '政策',
}

interface ContentItem {
  id: number
  title: string
  slug: string
  category: string
  content: string
  summary: string | null
  authorId: string
  authorName: string
  status: string
  tags: string | null
  viewCount: number | null
  likeCount: number | null
  publishedAt: number | null
  createdAt: number
  updatedAt: number
}

export const ContentPage: React.FC = () => {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [editModal, setEditModal] = useState<ContentItem | null>(null)
  const [isCreate, setIsCreate] = useState(false)
  const [form] = Form.useForm<{
    title: string
    slug: string
    category: string
    content: string
    summary?: string
    tags?: string
  }>()

  const fetchContents = useCallback(async () => {
    try {
      setLoading(true)
      const query: Record<string, string> = { page: String(page), limit: '20' }
      if (categoryFilter) query.category = categoryFilter
      if (statusFilter) query.status = statusFilter
      if (search) query.search = search
      const response = await apiClient.api.admin.contents.$get({ query })
      const result = await response.json()
      if (result.success) {
        setContents((result.data as { items: ContentItem[]; total: number }).items)
        setTotal((result.data as { items: ContentItem[]; total: number }).total)
      }
    } catch {
      message.error('获取内容列表失败')
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryFilter, statusFilter])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  const openCreateModal = () => {
    setIsCreate(true)
    setEditModal(null)
    form.resetFields()
  }

  const openEditModal = (record: ContentItem) => {
    setIsCreate(false)
    setEditModal(record)
    form.setFieldsValue({
      title: record.title,
      slug: record.slug,
      category: record.category,
      content: record.content,
      summary: record.summary || '',
      tags: record.tags || '',
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (isCreate) {
        const response = await apiClient.api.admin.contents.$post({
          json: { ...values, authorId: 'admin', authorName: '管理员' },
        })
        const result = await response.json()
        if (result.success) {
          message.success('创建成功')
        }
      } else if (editModal) {
        const response = await apiClient.api.admin.contents[':id'].$put({
          param: { id: String(editModal.id) },
          json: values,
        })
        const result = await response.json()
        if (result.success) {
          message.success('更新成功')
        }
      }
      setEditModal(null)
      form.resetFields()
      fetchContents()
    } catch {
      message.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.api.admin.contents[':id'].$delete({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('删除成功')
        fetchContents()
      }
    } catch {
      message.error('删除失败')
    }
  }

  const handlePublish = async (id: number) => {
    try {
      const response = await apiClient.api.admin.contents[':id'].publish.$put({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('发布成功')
        fetchContents()
      }
    } catch {
      message.error('发布失败')
    }
  }

  const handleArchive = async (id: number) => {
    try {
      const response = await apiClient.api.admin.contents[':id'].archive.$put({
        param: { id: String(id) },
      })
      const result = await response.json()
      if (result.success) {
        message.success('归档成功')
        fetchContents()
      }
    } catch {
      message.error('归档失败')
    }
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Slug', dataIndex: 'slug', key: 'slug', ellipsis: true },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (cat: string) => categoryLabels[cat] || cat,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => <Tag color={statusColorMap[status]}>{status}</Tag>,
    },
    { title: '作者', dataIndex: 'authorName', key: 'authorName', width: 100 },
    {
      title: '浏览',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 70,
      render: (v: number | null) => v ?? 0,
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 160,
      render: (ts: number | null) => (ts ? new Date(ts).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: ContentItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<Edit className="w-3 h-3" />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button
              size="small"
              type="primary"
              icon={<Upload className="w-3 h-3" />}
              onClick={() => handlePublish(record.id)}
            >
              发布
            </Button>
          )}
          {record.status === 'published' && (
            <Button
              size="small"
              icon={<Archive className="w-3 h-3" />}
              onClick={() => handleArchive(record.id)}
            >
              归档
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<Trash2 className="w-3 h-3" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div data-testid="admin-content-page">
      <div className="mb-4 flex gap-4 items-center">
        <Input
          placeholder="搜索标题/内容"
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
          placeholder="分类筛选"
          value={categoryFilter}
          onChange={val => {
            setCategoryFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 130 }}
          options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
        />
        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={val => {
            setStatusFilter(val)
            setPage(1)
          }}
          allowClear
          style={{ width: 130 }}
          options={['draft', 'published', 'archived'].map(s => ({ value: s, label: s }))}
        />
        <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
          新建
        </Button>
      </div>

      <Table
        dataSource={contents}
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
        title={isCreate ? '新建内容' : `编辑内容 - ${editModal?.title || ''}`}
        open={!!editModal || isCreate}
        onOk={handleSubmit}
        onCancel={() => {
          setEditModal(null)
          setIsCreate(false)
          form.resetFields()
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入标题' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="slug"
              label="Slug"
              rules={[{ required: true, message: '请输入 Slug' }]}
            >
              <Input />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="category"
              label="分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select
                options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            <Form.Item name="tags" label="标签（逗号分隔）">
              <Input placeholder="标签1,标签2" />
            </Form.Item>
          </div>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <Input.TextArea rows={8} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
