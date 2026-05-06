import { Button, Space, Popconfirm, Tag } from 'antd'
import { KeyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { RoleType } from '@shared/modules/role/schemas'

export const getColumns = (
  onManagePermissions: (role: RoleType) => void,
  onEdit: (role: RoleType) => void,
  onDelete: (id: string) => void
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
          <Button type="link" icon={<KeyOutlined />} onClick={() => onManagePermissions(record)}>
            权限
          </Button>
        )}
        <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
          编辑
        </Button>
        {!record.isSystem && (
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )}
      </Space>
    ),
  },
]
