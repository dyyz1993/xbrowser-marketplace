import { useState } from 'react'
import { pluginAdminApi } from '../services/plugin-admin-api'
import { useCRUD } from '../hooks/useCRUD'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm, Tag } from 'antd'
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
  const [submitting, setSubmitting] = useState(false)
  const [createForm] = Form.useForm<CategoryFormValues>()
  const [editForm] = Form.useForm<CategoryFormValues>()

  const {
    items: categories,
    loading,
    fetchItems,
    showCreateModal,
    showEditModal,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useCRUD<CategoryItem, CategoryFormValues, CategoryFormValues>({
    fetchFn: async () => {
      const result = await pluginAdminApi.getCategories()
      if (result.success) {
        return result.data as unknown as CategoryItem[]
      }
      return []
    },
    createFn: async input => {
      const result = await pluginAdminApi.createCategory(input)
      if (!result.success) throw new Error('Create failed')
      return result.data as unknown as CategoryItem
    },
    updateFn: async (id, input) => {
      const result = await pluginAdminApi.updateCategory(id, input)
      if (!result.success) throw new Error('Update failed')
      return result.data as unknown as CategoryItem
    },
    deleteFn: async id => {
      const result = await pluginAdminApi.deleteCategory(id)
      if (!result.success) throw new Error('Delete failed')
    },
    itemName: 'Category',
  })

  const onOpenEdit = (category: CategoryItem) => {
    editForm.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      icon: category.icon ?? undefined,
      sortOrder: category.sortOrder ?? undefined,
    })
    openEdit(category)
  }

  const onSubmitCreate = async () => {
    const values = await createForm.validateFields()
    setSubmitting(true)
    try {
      await handleCreate(values)
      createForm.resetFields()
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitEdit = async () => {
    const values = await editForm.validateFields()
    setSubmitting(true)
    try {
      await handleUpdate(values)
      editForm.resetFields()
    } finally {
      setSubmitting(false)
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
            onClick={() => onOpenEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title={`Delete "${record.name}"?`}
            description={
              record.pluginCount > 0 ? `${record.pluginCount} plugins will be unlinked.` : ''
            }
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
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={fetchItems}>
            Refresh
          </Button>
          <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
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
        title="Add Category"
        open={showCreateModal}
        onOk={onSubmitCreate}
        onCancel={() => {
          closeCreate()
          createForm.resetFields()
        }}
        confirmLoading={submitting}
        okText="Create"
      >
        <Form form={createForm} layout="vertical" className="mt-4">
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

      <Modal
        title="Edit Category"
        open={showEditModal}
        onOk={onSubmitEdit}
        onCancel={() => {
          closeEdit()
          editForm.resetFields()
        }}
        confirmLoading={submitting}
        okText="Update"
      >
        <Form form={editForm} layout="vertical" className="mt-4">
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
