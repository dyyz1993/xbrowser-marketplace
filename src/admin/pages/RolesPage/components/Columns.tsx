import { Button, Space, Tag } from 'antd'
import { KeyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RoleType } from '@shared/modules/role/schemas'

export const getColumns = (
  onAssignRole: (role: RoleType) => void,
  onEdit: (role: RoleType) => void,
  onDeleteClick: (id: string) => void
): ColumnsType<RoleType> => [
  {
    title: '角色代码',
    dataIndex: 'code',
    key: 'code',
  },
  {
    title: '角色名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '显示名称',
    dataIndex: 'label',
    key: 'label',
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: '系统角色',
    dataIndex: 'isSystem',
    key: 'isSystem',
    render: (isSystem: boolean) => (
      <Tag color={isSystem ? 'blue' : 'default'}>{isSystem ? '是' : '否'}</Tag>
    ),
  },
  {
    title: '状态',
    dataIndex: 'isActive',
    key: 'isActive',
    render: (isActive: boolean) => (
      <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '禁用'}</Tag>
    ),
  },
  {
    title: '操作',
    key: 'action',
    render: (_: unknown, record: RoleType) => (
      <Space>
        {record.code !== 'super_admin' && (
          <Button
            type="link"
            icon={<KeyOutlined />}
            onClick={() => onAssignRole(record)}
            data-testid="assign-role-button"
          >
            权限
          </Button>
        )}
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
          data-testid="edit-role-button"
        >
          编辑
        </Button>
        {!record.isSystem && (
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteClick(record.id)}
            data-testid="delete-role-button"
          >
            删除
          </Button>
        )}
      </Space>
    ),
  },
]
