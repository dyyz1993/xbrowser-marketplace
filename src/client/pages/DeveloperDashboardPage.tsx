import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { useAuthStore } from '@client/stores/authStore'
import { pluginApi } from '@client/services/plugin-api'

type PluginStatus = 'pending' | 'approved' | 'rejected' | 'removed'

interface DeveloperPlugin {
  id: string
  name: string
  slug: string
  description: string
  version: string
  status: PluginStatus
  downloadCount: number
  createdAt: number
  updatedAt: number
}

const STATUS_CONFIG: Record<
  PluginStatus,
  { icon: React.FC<{ className?: string }>; label: string; color: string }
> = {
  pending: { icon: Clock, label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
  approved: { icon: CheckCircle, label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'bg-red-100 text-red-800' },
  removed: { icon: Trash2, label: 'Removed', color: 'bg-gray-100 text-gray-800' },
}

export const DeveloperDashboardPage: React.FC = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [plugins, setPlugins] = useState<DeveloperPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMyPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await pluginApi.list({ limit: 100 })
      if (result.success && result.data) {
        setPlugins(result.data.items as unknown as DeveloperPlugin[])
      } else {
        setError('Failed to load plugins')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPlugins()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, fetchMyPlugins])

  if (!isAuthenticated) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-16 text-center"
        data-testid="developer-dashboard-auth-required"
      >
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-600">You need to be logged in to view your plugins.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="developer-dashboard-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Plugins</h1>
          <p className="text-gray-600 mt-1">Manage your published plugins</p>
        </div>
        <Link
          to="/publish"
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          data-testid="nav-publish-link-dashboard"
        >
          + New Plugin
        </Link>
      </div>

      {error && (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          data-testid="developer-dashboard-error"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500" data-testid="developer-dashboard-loading">
          Loading your plugins...
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12" data-testid="developer-dashboard-empty">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No plugins yet</h3>
          <p className="text-gray-600 mb-6">Get started by publishing your first plugin!</p>
          <Link
            to="/publish"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Publish Plugin
          </Link>
        </div>
      ) : (
        <div className="space-y-4" data-testid="developer-plugin-list">
          {plugins.map(plugin => {
            const statusCfg = STATUS_CONFIG[plugin.status] || STATUS_CONFIG.pending
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={plugin.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                data-testid="developer-plugin-item"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Link
                        to={`/plugin/${plugin.slug}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        data-testid={`developer-plugin-link-${plugin.slug}`}
                      >
                        {plugin.name}
                      </Link>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{plugin.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>v{plugin.version}</span>
                      <span>{plugin.downloadCount} downloads</span>
                      <span>Updated {new Date(plugin.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
