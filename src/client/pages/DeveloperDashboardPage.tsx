import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Trash2, Edit } from 'lucide-react'
import { useAuthStore } from '@client/stores/authStore'
import { apiClient } from '@client/services/apiClient'
import type { PluginListItem } from '@shared/modules/plugins'

type PluginStatus = 'pending' | 'approved' | 'rejected' | 'removed'

interface DeveloperPlugin extends PluginListItem {
  status: PluginStatus
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
  const token = useAuthStore(s => s.token)
  const [plugins, setPlugins] = useState<DeveloperPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMyPlugins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.api.plugins.mine.$get()
      const result = await res.json()
      if (result.success) {
        setPlugins((result.data as unknown as { items: DeveloperPlugin[] }).items)
      } else {
        setError('Failed to load plugins')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDelete = useCallback(async (slug: string) => {
    if (!confirm('Are you sure you want to remove this plugin?')) return
    try {
      const res = await apiClient.api.plugins[':slug'].$delete({
        param: { slug },
      })
      const result = await res.json()
      if (result.success) {
        setPlugins(prev => prev.filter(p => p.slug !== slug))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchMyPlugins()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, token, fetchMyPlugins])

  if (!isAuthenticated) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-16 text-center"
        data-testid="developer-dashboard-auth-required"
      >
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to view your plugins.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="developer-dashboard-login-link"
        >
          Sign In
        </Link>
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
            const statusCfg =
              STATUS_CONFIG[(plugin.status as PluginStatus) || 'pending'] || STATUS_CONFIG.pending
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={plugin.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                data-testid={`developer-plugin-item-${plugin.slug}`}
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
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/publish?edit=${plugin.slug}`}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit"
                      data-testid={`developer-plugin-edit-${plugin.slug}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(plugin.slug)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                      data-testid={`developer-plugin-delete-${plugin.slug}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
