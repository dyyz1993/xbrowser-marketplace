import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCRUD } from '../useCRUD'

vi.mock('antd', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

interface TestItem {
  id: string
  name: string
}

const mockFetchFn = vi.fn<() => Promise<TestItem[]>>()
const mockCreateFn = vi.fn<(input: { name: string }) => Promise<TestItem>>()
const mockUpdateFn = vi.fn<(id: string, input: { name: string }) => Promise<TestItem>>()
const mockDeleteFn = vi.fn<(id: string) => Promise<void>>()

const defaultItems: TestItem[] = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
]

const createOptions = () => ({
  fetchFn: mockFetchFn,
  createFn: mockCreateFn,
  updateFn: mockUpdateFn,
  deleteFn: mockDeleteFn,
  itemName: 'Item',
})

describe('useCRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchFn.mockResolvedValue(defaultItems)
    mockCreateFn.mockResolvedValue({ id: '3', name: 'New Item' })
    mockUpdateFn.mockResolvedValue({ id: '1', name: 'Updated' })
    mockDeleteFn.mockResolvedValue(undefined)
  })

  it('should auto-fetch items on mount', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    expect(result.current.loading).toBe(true)

    await act(() => Promise.resolve())

    expect(mockFetchFn).toHaveBeenCalledTimes(1)
    expect(result.current.items).toEqual(defaultItems)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should set error when fetch fails', async () => {
    mockFetchFn.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    expect(result.current.error).toBe('Failed to fetch items')
    expect(result.current.items).toEqual([])
  })

  it('should open and close create modal', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    expect(result.current.showCreateModal).toBe(false)

    act(() => {
      result.current.openCreate()
    })
    expect(result.current.showCreateModal).toBe(true)

    act(() => {
      result.current.closeCreate()
    })
    expect(result.current.showCreateModal).toBe(false)
  })

  it('should open and close edit modal with editing item', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    const itemToEdit = defaultItems[0]

    act(() => {
      result.current.openEdit(itemToEdit)
    })
    expect(result.current.showEditModal).toBe(true)
    expect(result.current.editingItem).toEqual(itemToEdit)

    act(() => {
      result.current.closeEdit()
    })
    expect(result.current.showEditModal).toBe(false)
    expect(result.current.editingItem).toBeNull()
  })

  it('should handle create and refetch items', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    act(() => {
      result.current.openCreate()
    })
    expect(result.current.showCreateModal).toBe(true)

    await act(async () => {
      await result.current.handleCreate({ name: 'New Item' })
    })

    expect(mockCreateFn).toHaveBeenCalledWith({ name: 'New Item' })
    expect(result.current.showCreateModal).toBe(false)
    expect(mockFetchFn).toHaveBeenCalledTimes(2)
  })

  it('should handle update and refetch items', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    act(() => {
      result.current.openEdit(defaultItems[0])
    })

    await act(async () => {
      await result.current.handleUpdate({ name: 'Updated' })
    })

    expect(mockUpdateFn).toHaveBeenCalledWith('1', { name: 'Updated' })
    expect(result.current.showEditModal).toBe(false)
    expect(result.current.editingItem).toBeNull()
    expect(mockFetchFn).toHaveBeenCalledTimes(2)
  })

  it('should not call updateFn when no editingItem', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    await act(async () => {
      await result.current.handleUpdate({ name: 'Updated' })
    })

    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('should handle delete and refetch items', async () => {
    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    await act(async () => {
      await result.current.handleDelete('1')
    })

    expect(mockDeleteFn).toHaveBeenCalledWith('1')
    expect(mockFetchFn).toHaveBeenCalledTimes(2)
  })

  it('should handle create error and show error message', async () => {
    mockCreateFn.mockRejectedValueOnce(new Error('Create failed'))

    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    act(() => {
      result.current.openCreate()
    })

    await act(async () => {
      await result.current.handleCreate({ name: 'Fail' })
    })

    expect(result.current.showCreateModal).toBe(true)
  })

  it('should handle delete error', async () => {
    mockDeleteFn.mockRejectedValueOnce(new Error('Delete failed'))

    const { result } = renderHook(() =>
      useCRUD<TestItem, { name: string }, { name: string }>(createOptions())
    )

    await act(() => Promise.resolve())

    await act(async () => {
      await result.current.handleDelete('1')
    })

    expect(mockFetchFn).toHaveBeenCalledTimes(1)
  })
})
