import { Tag, Button, Space, Popconfirm } from 'antd'
import { CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import type { PluginItem } from '../types'
import { statusColorMap, statusLabelMap } from '../types'

export const getColumns = (
  onView: (record: PluginItem) => void,
  onApprove: (slug: string) => void,
  onReject: (record: PluginItem) => void,
  onDelete: (slug: string) => void
): ColumnsType<PluginItem> => [
  {
    title: 'Plugin',
    dataIndex: 'name',
    key: 'name',
    render: (name: string, record: PluginItem) => (
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-gray-400">{record.slug}</div>
      </div>
    ),
  },
  {
    title: 'Author',
    dataIndex: 'authorName',
    key: 'authorName',
  },
  {
    title: 'Version',
    dataIndex: 'version',
    key: 'version',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => (
      <Tag color={statusColorMap[status]}>{statusLabelMap[status] || status}</Tag>
    ),
  },
  {
    title: 'Submitted',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (ts: number) => new Date(ts).toLocaleDateString(),
    sorter: (a: PluginItem, b: PluginItem) => a.createdAt - b.createdAt,
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: unknown, record: PluginItem) => (
      <Space>
        <Button size="small" icon={<Eye className="w-3 h-3" />} onClick={() => onView(record)} />
        {record.status === 'pending' && (
          <>
            <Popconfirm
              title={`Approve "${record.name}"?`}
              onConfirm={() => onApprove(record.slug)}
              okButtonProps={{ 'data-testid': 'confirm-approve-button' }}
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckCircle className="w-3 h-3" />}
                data-testid="approve-button"
              >
                Approve
              </Button>
            </Popconfirm>
            <Button
              danger
              size="small"
              icon={<XCircle className="w-3 h-3" />}
              onClick={() => onReject(record)}
              data-testid="reject-button"
            >
              Reject
            </Button>
          </>
        )}
        <Popconfirm
          title={`Delete "${record.name}"?`}
          description="This will permanently remove the plugin."
          onConfirm={() => onDelete(record.slug)}
          okButtonProps={{ 'data-testid': 'confirm-delete-button' }}
        >
          <Button
            danger
            size="small"
            icon={<Trash2 className="w-3 h-3" />}
            data-testid="delete-button"
          >
            Delete
          </Button>
        </Popconfirm>
      </Space>
    ),
  },
]
