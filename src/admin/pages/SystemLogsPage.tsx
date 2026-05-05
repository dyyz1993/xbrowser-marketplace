import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Select, Space, Tag, Button, Descriptions, Modal } from 'antd'
import { SearchOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuditLogStore } from '../hooks/useAuditLogs'
import type { AuditLogType } from '@shared/modules/audit'
import {
  RESOURCE_TYPES,
  RESOURCE_LABELS,
  ACTION_TYPES,
  ACTION_LABELS,
  ACTION_COLORS,
  type ResourceType,
  type ActionType,
} from '@shared/constants'

const { Option } = Select

export const SystemLogsPage: React.FC = () => {
  const { logs, loading, fetchLogs } = useAuditLogStore()
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [filters, setFilters] = useState<{
    userId: string
    action: ActionType | ''
    resourceType: ResourceType | ''
  }>({
    userId: '',
    action: '',
    resourceType: '',
  })

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = () => {
    fetchLogs({
      userId: filters.userId || undefined,
      action: filters.action || undefined,
      resourceType: filters.resourceType || undefined,
    })
  }

  const handleReset = () => {
    setFilters({ userId: '', action: '', resourceType: '' })
    fetchLogs()
  }

  const handleViewDetail = (log: AuditLogType) => {
    setSelectedLog(log)
    setDetailModalVisible(true)
  }

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: ActionType) => (
        <Tag color={ACTION_COLORS[action] || 'default'}>{ACTION_LABELS[action] || action}</Tag>
      ),
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
      render: (type: ResourceType) => RESOURCE_LABELS[type] || type,
    },
    {
      title: '资源ID',
      dataIndex: 'resourceId',
      key: 'resourceId',
      width: 150,
      render: (id: string | null) => id || '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip: string | null) => ip || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AuditLogType) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="系统日志"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>
            刷新
          </Button>
        }
      >
        <Space style={{ marginBottom: '16px' }} wrap>
          <Input
            placeholder="用户ID"
            value={filters.userId}
            onChange={e => setFilters({ ...filters, userId: e.target.value })}
            style={{ width: 150 }}
          />
          <Select
            placeholder="操作类型"
            value={filters.action || undefined}
            onChange={value => setFilters({ ...filters, action: (value || '') as ActionType | '' })}
            style={{ width: 120 }}
            allowClear
          >
            {Object.entries(ACTION_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {ACTION_LABELS[value]}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="资源类型"
            value={filters.resourceType || undefined}
            onChange={value =>
              setFilters({ ...filters, resourceType: (value || '') as ResourceType | '' })
            }
            style={{ width: 120 }}
            allowClear
          >
            {Object.entries(RESOURCE_TYPES).map(([key, value]) => (
              <Option key={key} value={value}>
                {RESOURCE_LABELS[value]}
              </Option>
            ))}
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="日志详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedLog && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="日志ID">{selectedLog.id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedLog.userId}</Descriptions.Item>
            <Descriptions.Item label="操作">
              <Tag color={ACTION_COLORS[selectedLog.action] || 'default'}>
                {ACTION_LABELS[selectedLog.action] || selectedLog.action}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {RESOURCE_LABELS[selectedLog.resourceType] || selectedLog.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label="资源ID">{selectedLog.resourceId || '-'}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{selectedLog.ipAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="User Agent">{selectedLog.userAgent || '-'}</Descriptions.Item>
            <Descriptions.Item label="时间">
              {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {selectedLog.oldValue && (
              <Descriptions.Item label="旧值">
                <pre style={{ margin: 0, maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {selectedLog.newValue && (
              <Descriptions.Item label="新值">
                <pre style={{ margin: 0, maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
