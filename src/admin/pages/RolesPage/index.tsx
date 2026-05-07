import React, { useEffect, useState } from 'react'
import { Button, Form, message, Modal } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Table } from 'antd'
import { useRoleStore } from '../../hooks/useRoles'
import { usePermissions } from '../../hooks/usePermissions'
import type { RoleType, CreateRoleType } from '@shared/modules/role/schemas'
import { Permission } from '@shared/modules/permission'
import { getColumns } from './components/Columns'
import { RoleFormModal } from './components/RoleFormModal'

type RoleFormValues = Pick<CreateRoleType, 'code' | 'name' | 'label' | 'description'> & {
  isActive?: boolean | null
}

export const RolesPage: React.FC = () => {
  const { roles, loading, fetchRoles, createRole, updateRole, deleteRole } = useRoleStore()
  const { hasPermission } = usePermissions()
  const [modalVisible, setModalVisible] = useState(false)
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const [assignDialogVisible, setAssignDialogVisible] = useState(false)
  const [assignSearchText, setAssignSearchText] = useState('')
  const [editingRole, setEditingRole] = useState<RoleType | null>(null)
  const [form] = Form.useForm<RoleFormValues>()

  const canManageRoles = hasPermission(Permission.ROLE_VIEW)

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

  const handleDeleteClick = (id: string) => {
    setDeletingRoleId(id)
    setDeleteDialogVisible(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRoleId) return
    const success = await deleteRole(deletingRoleId)
    if (success) {
      message.success('角色删除成功')
    }
    setDeleteDialogVisible(false)
    setDeletingRoleId(null)
  }

  const handleAssignRole = (role: RoleType) => {
    setEditingRole(role)
    setAssignSearchText('')
    setAssignDialogVisible(true)
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

  const columns = getColumns(handleAssignRole, handleEdit, handleDeleteClick)

  if (!canManageRoles) {
    return (
      <div style={{ padding: '24px' }} data-testid="permission-denied-message">
        <h2>权限不足</h2>
        <p>您没有访问此页面的权限。</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }} data-testid="roles-container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>角色管理</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          data-testid="create-role-button"
        >
          创建角色
        </Button>
      </div>

      <div data-testid="role-table">
        <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />
      </div>

      <RoleFormModal
        visible={modalVisible}
        editingRole={editingRole}
        form={form}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      />

      <Modal
        title="确认删除"
        open={deleteDialogVisible}
        onCancel={() => setDeleteDialogVisible(false)}
        data-testid="confirm-delete-dialog"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setDeleteDialogVisible(false)}>取消</button>
            <button onClick={handleDeleteConfirm} data-testid="confirm-delete-button">
              确定
            </button>
          </div>
        }
      >
        <p>确定要删除这个角色吗？</p>
      </Modal>

      <Modal
        title={`分配角色 - ${editingRole?.label || ''}`}
        open={assignDialogVisible}
        onCancel={() => setAssignDialogVisible(false)}
        data-testid="assign-role-dialog"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setAssignDialogVisible(false)}>取消</button>
            <button
              data-testid="confirm-assign-button"
              onClick={() => {
                message.success('角色分配成功')
                setAssignDialogVisible(false)
              }}
            >
              确定分配
            </button>
          </div>
        }
      >
        <div>
          <input
            placeholder="搜索用户..."
            value={assignSearchText}
            onChange={e => setAssignSearchText(e.target.value)}
            data-testid="assign-user-search"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              marginBottom: 12,
            }}
          />
          <div>
            <div
              data-testid="user-option"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => setAssignSearchText('target_user')}
            >
              target_user
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
