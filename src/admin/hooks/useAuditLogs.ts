import { create } from 'zustand'
import { apiClient } from '../services/apiClient'
import type { AuditLogType } from '@shared/modules/audit'
import { type ResourceType, type ActionType } from '@shared/constants'

interface AuditLogState {
  logs: AuditLogType[]
  loading: boolean
  error: string | null
  fetchLogs: (params?: {
    userId?: string
    action?: ActionType
    resourceType?: ResourceType
  }) => Promise<void>
}

export const useAuditLogStore = create<AuditLogState>(set => ({
  logs: [],
  loading: false,
  error: null,

  fetchLogs: async params => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params?.userId) queryParams.append('userId', params.userId)
      if (params?.action) queryParams.append('action', params.action)
      if (params?.resourceType) queryParams.append('resourceType', params.resourceType)

      const response = await apiClient.api['audit-logs'].$get({
        query: Object.fromEntries(queryParams),
      })
      const data = await response.json()

      if (data.success) {
        set({ logs: data.data, loading: false })
      } else {
        set({ error: 'Failed to fetch audit logs', loading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },
}))
