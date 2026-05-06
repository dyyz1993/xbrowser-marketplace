import React, { useEffect, useState } from 'react'
import { Button, Form, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Table } from 'antd'
import { useRoleStore } from '../../hooks/useRoles'
import { useConfig, usePermissionCategories } from '../../hooks/useConfig'
import { usePermissions } from '../../hooks/usePermissions'
import type { RoleType, CreateRoleType } from '@shared/modules/role/schemas'
import { apiClient } from '../../services/apiClient'
import { validatePermissionDependencies } from '@shared/modules/permission/permission-dependencies'
import { getColumns } from './components/Columns'
import { RoleFormModal } from './components/RoleFormModal'
import { PermissionModal } from './components/PermissionModal'

type RoleFormValues = Pick<CreateRoleType, 'code' | 'name' | 'label' | 'description'> & {
  isActive?: boolean | null
}

export const RolesPage: React.FC = () => {
  const { roles, loading, fetchRoles, createRole, updateRole, deleteRole, updateRolePermissions } =
    useRoleStore()
  const { permissions } = useConfig()
  const { categories } = usePermissionCategories()
  const { refreshPermissions } = usePermissions()
  const [modalVisible, setModalVisible] = useState(false)
  const [permissionModalVisible, setPermissionModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleType | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => [])
  const [form] = Form.useForm<RoleFormValues>()

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleCreate = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (role: RoleType) => {
    setEditingRole(role)
    form.setFieldsValue({
      code: role.code,
      name: role.name,
      label: role.label,
      description: role.description,
      isActive: role.isActive ?? undefined,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const success = await deleteRole(id)
    if (success) {
      message.success('角色删除成功')
    }
  }

  const handleManagePermissions = async (role: RoleType) => {
    setEditingRole(role)

    try {
      const response = await apiClient.api.roles[':id'].$get({
        param: { id: role.id },
      })
      const data = await response.json()

      if (data.success && data.data.permissions) {
        setSelectedPermissions(data.data.permissions)
      } else {
        setSelectedPermissions([])
      }
    } catch (error) {
      console.error('Failed to fetch role permissions:', error)
      setSelectedPermissions([])
    }

    setPermissionModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingRole) {
        const success = await updateRole(editingRole.id, values)
        if (success) {
          message.success('角色更新成功')
          setModalVisible(false)
        }
      } else {
        const success = await createRole(values)
        if (success) {
          message.success('角色创建成功')
          setModalVisible(false)
        }
      }
    } catch (error) {
      console.error('Form validation failed:', error)
    }
  }

  const handlePermissionSubmit = async () => {
    if (!editingRole) return

    const validation = validatePermissionDependencies(selectedPermissions)
    if (!validation.valid) {
      const { Modal } = await import('antd')
      Modal.error({
        title: '权限依赖校验失败',
        content: (
          <div>
            <p>以下权限配置存在问题：</p>
            <ul>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ),
      })
      return
    }

    const success = await updateRolePermissions(editingRole.id, selectedPermissions)
    if (success) {
      message.success('权限更新成功')
      setPermissionModalVisible(false)
      await refreshPermissions()
    }
  }

  const columns = getColumns(handleManagePermissions, handleEdit, handleDelete)

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>角色管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建角色
        </Button>
      </div>

      <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />

      <RoleFormModal
        visible={modalVisible}
        editingRole={editingRole}
        form={form}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      />

      <PermissionModal
        visible={permissionModalVisible}
        roleLabel={editingRole?.label || ''}
        selectedPermissions={selectedPermissions}
        allPermissions={permissions}
        categories={categories}
        onSelectionChange={setSelectedPermissions}
        onOk={handlePermissionSubmit}
        onCancel={() => setPermissionModalVisible(false)}
      />
    </div>
  )
}
