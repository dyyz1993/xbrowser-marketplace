import { useEffect, useState, useCallback } from 'react'
import { pluginAdminApi } from '../services/plugin-admin-api'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message,
  Tag,
} from 'antd'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number | null
  pluginCount: number
}

interface CategoryFormValues {
  name: string
  slug: string
  description?: string
  icon?: string
  sortOrder?: number
}

export const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<CategoryFormValues>()

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const result = await pluginAdminApi.getCategories()
      if (result.success) {
        setCategories(result.data as unknown as CategoryItem[])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (category: CategoryItem) => {
    setEditingCategory(category)
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder ?? undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingCategory) {
        const result = await pluginAdminApi.updateCategory(editingCategory.id, values)
        if (result.success) {
          message.success('Category updated')
        }
      } else {
        const result = await pluginAdminApi.createCategory(values)
        if (result.success) {
          message.success('Category created')
        }
      }

      setModalOpen(false)
      form.resetFields()
      fetchCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await pluginAdminApi.deleteCategory(id)
      if (result.success) {
        message.success('Category deleted')
        fetchCategories()
      }
    } catch {
      message.error('Failed to delete category')
    }
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CategoryItem) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-xs text-gray-400">{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span className="text-gray-300">—</span>,
    },
    {
      title: 'Icon',
      dataIndex: 'icon',
      key: 'icon',
      render: (icon: string | null) =>
        icon ? <Tag>{icon}</Tag> : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Sort Order',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      render: (order: number | null) => order ?? 0,
    },
    {
      title: 'Plugins',
      dataIndex: 'pluginCount',
      key: 'pluginCount',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: CategoryItem) => (
        <Space>
          <Button
            size="small"
            icon={<Pencil className="w-3 h-3" />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title={`Delete "${record.name}"?`}
            description={record.pluginCount > 0 ? `${record.pluginCount} plugins will be unlinked.` : ''}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button danger size="small" icon={<Trash2 className="w-3 h-3" />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Space>
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchCategories}>
            Refresh
          </Button>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            Add Category
          </Button>
        </Space>
      </div>

      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={false}
      />

      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        confirmLoading={submitting}
        okText={editingCategory ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="Category name" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: 'Slug is required' },
              { pattern: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, and hyphens' },
            ]}
          >
            <Input placeholder="category-slug" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="icon" label="Icon">
            <Input placeholder="Icon name (e.g. puzzle)" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order">
            <InputNumber min={0} placeholder="0" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
