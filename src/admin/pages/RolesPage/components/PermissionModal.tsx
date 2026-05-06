import { Modal, Tabs } from 'antd'
import { CodeOutlined, ApartmentOutlined } from '@ant-design/icons'
import type { PermissionInfo, PermissionCategory } from '@shared/modules/permission'
import { PermissionConfigEditor } from '../../../components/PermissionConfigEditor'
import { PermissionTree } from '../../../components/PermissionTree'

export const PermissionModal: React.FC<{
  visible: boolean
  roleLabel: string
  selectedPermissions: string[]
  allPermissions: PermissionInfo[]
  categories: Record<string, PermissionCategory>
  onSelectionChange: (perms: string[]) => void
  onOk: () => void
  onCancel: () => void
}> = ({
  visible,
  roleLabel,
  selectedPermissions,
  allPermissions,
  categories,
  onSelectionChange,
  onOk,
  onCancel,
}) => (
  <Modal
    title={`管理角色权限 - ${roleLabel || ''}`}
    open={visible}
    onOk={onOk}
    onCancel={onCancel}
    width={900}
    okText="保存"
    cancelText="取消"
  >
    <Tabs
      defaultActiveKey="tree"
      items={[
        {
          key: 'tree',
          label: (
            <span>
              <ApartmentOutlined />
              树状选择
            </span>
          ),
          children: (
            <PermissionTree
              permissions={allPermissions}
              categories={categories}
              selectedPermissions={selectedPermissions}
              onSelectionChange={onSelectionChange}
            />
          ),
        },
        {
          key: 'json',
          label: (
            <span>
              <CodeOutlined />
              JSON编辑
            </span>
          ),
          children: (
            <PermissionConfigEditor
              visible={true}
              title=""
              permissions={allPermissions}
              selectedPermissions={selectedPermissions}
              onCancel={() => {}}
              onOk={onSelectionChange}
            />
          ),
        },
      ]}
    />
  </Modal>
)
