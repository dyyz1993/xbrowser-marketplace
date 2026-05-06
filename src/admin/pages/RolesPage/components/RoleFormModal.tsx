import { Modal, Form, Input, Switch } from 'antd'
import type { RoleType, CreateRoleType } from '@shared/modules/role/schemas'

type RoleFormValues = Pick<CreateRoleType, 'code' | 'name' | 'label' | 'description'> & {
  isActive?: boolean | null
}

export const RoleFormModal: React.FC<{
  visible: boolean
  editingRole: RoleType | null
  form: ReturnType<typeof Form.useForm<RoleFormValues>>[0]
  onOk: () => void
  onCancel: () => void
}> = ({ visible, editingRole, form, onOk, onCancel }) => (
  <Modal
    title={editingRole ? '编辑角色' : '创建角色'}
    open={visible}
    onOk={onOk}
    onCancel={onCancel}
    okText="确定"
    cancelText="取消"
  >
    <Form form={form} layout="vertical">
      <Form.Item
        name="code"
        label="角色代码"
        rules={[{ required: true, message: '请输入角色代码' }]}
      >
        <Input disabled={!!editingRole} placeholder="请输入角色代码，如：manager" />
      </Form.Item>

      <Form.Item
        name="name"
        label="角色名称"
        rules={[{ required: true, message: '请输入角色名称' }]}
      >
        <Input placeholder="请输入角色名称" />
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
    </Form>
  </Modal>
)
