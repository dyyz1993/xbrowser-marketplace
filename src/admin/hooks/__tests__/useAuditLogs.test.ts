import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuditLogStore } from '../useAuditLogs'

const { mockLogs, mockGet } = vi.hoisted(() => {
  const logs = [
    {
      id: 'log-1',
      userId: 'user-1',
      action: 'create' as const,
      resourceType: 'user' as const,
      resourceId: 'res-1',
      oldValue: null,
      newValue: '{"name":"test"}',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'log-2',
      userId: 'user-2',
      action: 'update' as const,
      resourceType: 'role' as const,
      resourceId: 'role-1',
      oldValue: '{"name":"old"}',
      newValue: '{"name":"new"}',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: '2025-01-01T01:00:00Z',
    },
  ]

  const get = vi.fn(async () => ({
    json: async () => ({ success: true, data: logs }),
  }))

  return { mockLogs: logs, mockGet: get }
})

vi.mock('../../services/apiClient', () => ({
  apiClient: {
    api: {
      'audit-logs': {
        $get: mockGet,
      },
    },
  },
}))

describe('useAuditLogStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuditLogStore.setState({
      logs: [],
      loading: false,
      error: null,
    })
  })

  it('should have correct initial state', () => {
    const state = useAuditLogStore.getState()
    expect(state.logs).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should fetch logs successfully', async () => {
    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.logs).toHaveLength(2)
    expect(state.logs[0].id).toBe('log-1')
    expect(state.loading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set loading to true while fetching', async () => {
    let loadingDuringFetch = false

    mockGet.mockImplementationOnce(async () => {
      loadingDuringFetch = useAuditLogStore.getState().loading
      return { json: async () => ({ success: true, data: mockLogs }) }
    })

    const fetchPromise = useAuditLogStore.getState().fetchLogs()
    expect(loadingDuringFetch).toBe(true)

    await fetchPromise

    expect(useAuditLogStore.getState().loading).toBe(false)
  })

  it('should clear error on new fetch', async () => {
    useAuditLogStore.setState({ error: 'Previous error' })

    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.error).toBeNull()
    expect(state.logs).toHaveLength(2)
  })

  it('should handle API error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.error).toBe('Network error')
    expect(state.loading).toBe(false)
    expect(state.logs).toEqual([])
  })

  it('should handle API returning success: false', async () => {
    mockGet.mockResolvedValueOnce({
      json: async () => ({ success: false, data: null }),
    } as unknown as Awaited<ReturnType<typeof mockGet>>)

    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs()

    const state = useAuditLogStore.getState()
    expect(state.error).toBe('Failed to fetch audit logs')
    expect(state.loading).toBe(false)
  })

  it('should pass query params for filtered fetch', async () => {
    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs({ userId: 'user-1', action: 'create' as const, resourceType: 'user' as const })

    expect(mockGet).toHaveBeenCalledWith({
      query: expect.objectContaining({
        userId: 'user-1',
        action: 'create',
        resourceType: 'user',
      }),
    })
  })

  it('should omit undefined params from query', async () => {
    const { fetchLogs } = useAuditLogStore.getState()
    await fetchLogs({ userId: 'user-1' })

    expect(mockGet).toHaveBeenCalledWith({
      query: expect.not.objectContaining({
        action: expect.anything(),
        resourceType: expect.anything(),
      }),
    })
  })
})
