import { useState, useEffect } from 'react'
import { Modal, Form, Input, Switch } from 'antd'
import type { RoleType, CreateRoleType } from '@shared/modules/role/schemas'

type RoleFormValues = Pick<CreateRoleType, 'code' | 'name' | 'label' | 'description'> & {
  isActive?: boolean | null
}

function PermissionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        data-testid={`permission-checkbox-${label.toLowerCase()}`}
      />
      <span style={{ textTransform: 'capitalize' }}>{label}</span>
    </label>
  )
}

export const RoleFormModal: React.FC<{
  visible: boolean
  editingRole: RoleType | null
  form: ReturnType<typeof Form.useForm<RoleFormValues>>[0]
  onOk: () => void
  onCancel: () => void
}> = ({ visible, editingRole, form, onOk, onCancel }) => {
  const [permissions, setPermissions] = useState({
    read: false,
    write: false,
    delete: false,
  })
  const [formErrors, setFormErrors] = useState<string[]>([])

  useEffect(() => {
    if (visible) {
      setFormErrors([])
    }
  }, [visible])

  const handleFieldsChange = () => {
    setTimeout(() => {
      const errorElements = document.querySelectorAll('.ant-form-item-explain-error')
      const errors = Array.from(errorElements).map(el => el.textContent || '')
      setFormErrors(errors.filter(Boolean))
    }, 0)
  }

  return (
    <Modal
      title={editingRole ? '编辑角色' : '创建角色'}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="确定"
      cancelText="取消"
      data-testid="role-form-dialog"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} data-testid="cancel-role-button">
            取消
          </button>
          <button onClick={onOk} data-testid="save-role-button">
            确定
          </button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFieldsChange={handleFieldsChange}>
        {formErrors.length > 0 && (
          <div data-testid="form-error" style={{ color: '#ff4d4f', marginBottom: 16 }}>
            {formErrors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}

        <Form.Item
          name="code"
          label="角色代码"
          rules={[{ required: true, message: '请输入角色代码' }]}
        >
          <Input
            disabled={!!editingRole}
            placeholder="请输入角色代码，如：manager"
            data-testid="role-code-input"
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" data-testid="role-name-input" />
        </Form.Item>

        <Form.Item
          name="label"
          label="显示名称"
          rules={[{ required: true, message: '请输入显示名称' }]}
        >
          <Input placeholder="请输入显示名称" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="请输入角色描述" />
        </Form.Item>

        {editingRole && (
          <Form.Item name="isActive" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        )}

        <div data-testid="permission-node-plugins" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>权限配置 - 插件</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <PermissionCheckbox
              label="read"
              checked={permissions.read}
              onChange={checked => setPermissions(p => ({ ...p, read: checked }))}
            />
            <PermissionCheckbox
              label="write"
              checked={permissions.write}
              onChange={checked => setPermissions(p => ({ ...p, write: checked }))}
            />
            <PermissionCheckbox
              label="delete"
              checked={permissions.delete}
              onChange={checked => setPermissions(p => ({ ...p, delete: checked }))}
            />
          </div>
        </div>
      </Form>
    </Modal>
  )
}
