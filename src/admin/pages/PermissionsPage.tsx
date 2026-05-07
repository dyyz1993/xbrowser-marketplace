import { useState } from 'react'
import { Card, Table, Tag } from 'antd'
import { usePermissions } from '../hooks/usePermissions'
import { usePermissionCategories, useRoleLabels, usePermissionLabels } from '../hooks/useConfig'
import type { PermissionInfo, Permission } from '@shared/modules/permission'

export const PermissionsPage: React.FC = () => {
  const { allPermissions, roles, loading } = usePermissions()
  const { categories } = usePermissionCategories()
  const { roleLabels } = useRoleLabels()
  const { permissionLabels } = usePermissionLabels()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [checkedPermissions, setCheckedPermissions] = useState<Set<string>>(new Set())

  const groupedPermissions = allPermissions.reduce(
    (acc, permission) => {
      const category = permission.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    },
    {} as Record<string, PermissionInfo[]>
  )

  const toggleGroup = (category: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const togglePermission = (permission: string) => {
    setCheckedPermissions(prev => {
      const next = new Set(prev)
      if (next.has(permission)) {
        next.delete(permission)
      } else {
        next.add(permission)
      }
      return next
    })
  }

  const columns = [
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: Permission) => permissionLabels[permission] || permission,
    },
    {
      title: '超级管理员',
      key: 'superAdmin',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'super_admin')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
    {
      title: '客服人员',
      key: 'customerService',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'customer_service')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
    {
      title: '普通用户',
      key: 'user',
      render: (_: unknown, record: PermissionInfo) => {
        const role = roles.find(r => r.role === 'user')
        const hasPermission = role?.permissions.includes(record.permission)
        return hasPermission ? <Tag color="green">✓</Tag> : <Tag color="red">✗</Tag>
      },
    },
  ]

  return (
    <div className="p-6" data-testid="permissions-container">
      <h1 className="text-2xl font-bold mb-6">权限管理</h1>

      <Card title="角色列表" className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role.role} size="small">
              <div className="text-lg font-semibold mb-2">{roleLabels[role.role] || role.role}</div>
              <div className="text-sm text-gray-500">权限数量: {role.permissions.length}</div>
            </Card>
          ))}
        </div>
      </Card>

      <Card title="权限树">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="mb-4">
            <div
              data-testid={
                category === 'plugins' ? 'permission-group-plugins' : `permission-group-${category}`
              }
              onClick={() => toggleGroup(category)}
              style={{
                cursor: 'pointer',
                padding: '8px 0',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>{expandedGroups.has(category) ? '▼' : '▶'}</span>
              <span>{categories[category]?.label || category}</span>
              <span style={{ fontWeight: 400, fontSize: 12, color: '#999' }}>({perms.length})</span>
            </div>

            {expandedGroups.has(category) && (
              <div style={{ paddingLeft: 24 }}>
                {perms.map(perm => {
                  const action = perm.permission.split(':')[1] || perm.permission
                  const testId =
                    category === 'plugins'
                      ? `permission-node-plugins-${action}`
                      : `permission-node-${category}-${action}`

                  return (
                    <div key={perm.permission} data-testid={testId} style={{ padding: '4px 0' }}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checkedPermissions.has(perm.permission)}
                          onChange={() => togglePermission(perm.permission)}
                          data-testid="permission-checkbox"
                        />
                        <span>{perm.label || perm.permission}</span>
                        <span style={{ color: '#999', fontSize: 12 }}>({perm.permission})</span>
                      </label>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card title="权限矩阵" style={{ marginTop: 16 }}>
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold mb-3">
              {categories[category]?.label || category}
            </h3>
            <Table
              columns={columns}
              dataSource={perms}
              rowKey="permission"
              pagination={false}
              loading={loading}
              size="small"
            />
          </div>
        ))}
      </Card>
    </div>
  )
}
