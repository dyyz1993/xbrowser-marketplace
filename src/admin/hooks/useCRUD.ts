import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'

interface CRUDOptions<T, CreateInput, UpdateInput> {
  fetchFn: () => Promise<T[]>
  createFn: (input: CreateInput) => Promise<T>
  updateFn: (id: string, input: UpdateInput) => Promise<T>
  deleteFn: (id: string) => Promise<void>
  itemName: string
}

interface CRUDReturn<T, CreateInput, UpdateInput> {
  items: T[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  showCreateModal: boolean
  showEditModal: boolean
  editingItem: T | null
  openCreate: () => void
  closeCreate: () => void
  openEdit: (item: T) => void
  closeEdit: () => void
  handleCreate: (input: CreateInput) => Promise<void>
  handleUpdate: (input: UpdateInput) => Promise<void>
  handleDelete: (id: string) => Promise<void>
}

export function useCRUD<T extends { id: string }, CreateInput, UpdateInput>(
  options: CRUDOptions<T, CreateInput, UpdateInput>
): CRUDReturn<T, CreateInput, UpdateInput> {
  const { fetchFn, createFn, updateFn, deleteFn, itemName } = options

  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setItems(result)
    } catch (err) {
      const msg = `Failed to fetch ${itemName.toLowerCase()}s`
      console.error(msg, err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, itemName])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const openCreate = useCallback(() => {
    setShowCreateModal(true)
  }, [])

  const closeCreate = useCallback(() => {
    setShowCreateModal(false)
  }, [])

  const openEdit = useCallback((item: T) => {
    setEditingItem(item)
    setShowEditModal(true)
  }, [])

  const closeEdit = useCallback(() => {
    setEditingItem(null)
    setShowEditModal(false)
  }, [])

  const handleCreate = useCallback(
    async (input: CreateInput) => {
      try {
        await createFn(input)
        message.success(`${itemName} created`)
        setShowCreateModal(false)
        await fetchItems()
      } catch (err) {
        const msg = `Failed to create ${itemName.toLowerCase()}`
        console.error(msg, err)
        message.error(msg)
      }
    },
    [createFn, fetchItems, itemName]
  )

  const handleUpdate = useCallback(
    async (input: UpdateInput) => {
      if (!editingItem) return
      try {
        await updateFn(editingItem.id, input)
        message.success(`${itemName} updated`)
        setEditingItem(null)
        setShowEditModal(false)
        await fetchItems()
      } catch (err) {
        const msg = `Failed to update ${itemName.toLowerCase()}`
        console.error(msg, err)
        message.error(msg)
      }
    },
    [editingItem, updateFn, fetchItems, itemName]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFn(id)
        message.success(`${itemName} deleted`)
        await fetchItems()
      } catch {
        message.error(`Failed to delete ${itemName.toLowerCase()}`)
      }
    },
    [deleteFn, fetchItems, itemName]
  )

  return {
    items,
    loading,
    error,
    fetchItems,
    showCreateModal,
    showEditModal,
    editingItem,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
