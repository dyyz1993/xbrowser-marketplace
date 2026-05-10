import { getDb } from '../../db'
import { settings } from '../../db/schema'
import { eq } from 'drizzle-orm'

export async function getAllSettings(): Promise<
  Array<{
    id: number
    key: string
    value: string
    description: string | null
    updatedAt: string
  }>
> {
  const db = await getDb()
  const rows = await db.select().from(settings)
  return rows.map(r => ({
    id: r.id,
    key: r.key,
    value: r.value,
    description: r.description,
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : new Date(Number(r.updatedAt) * 1000).toISOString(),
  }))
}

export async function getSettingByKey(key: string): Promise<{
  id: number
  key: string
  value: string
  description: string | null
  updatedAt: string
} | null> {
  const db = await getDb()
  const rows = await db.select().from(settings).where(eq(settings.key, key))
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    id: r.id,
    key: r.key,
    value: r.value,
    description: r.description,
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : new Date(Number(r.updatedAt) * 1000).toISOString(),
  }
}

export async function upsertSetting(
  key: string,
  value: string,
  description?: string
): Promise<{
  id: number
  key: string
  value: string
  description: string | null
  updatedAt: string
}> {
  const db = await getDb()
  const existing = await db.select().from(settings).where(eq(settings.key, key))
  const now = new Date()
  if (existing.length > 0) {
    const updateData: Record<string, unknown> = { value, updatedAt: now }
    if (description !== undefined) updateData.description = description
    await db.update(settings).set(updateData).where(eq(settings.key, key))
    const updated = await db.select().from(settings).where(eq(settings.key, key))
    const r = updated[0]
    return {
      id: r.id,
      key: r.key,
      value: r.value,
      description: r.description,
      updatedAt:
        r.updatedAt instanceof Date
          ? r.updatedAt.toISOString()
          : new Date(Number(r.updatedAt) * 1000).toISOString(),
    }
  }
  const insertData: Record<string, unknown> = { key, value, updatedAt: now }
  if (description !== undefined) insertData.description = description
  const result = await db.insert(settings).values(insertData).returning()
  const r = result[0]
  return {
    id: r.id,
    key: r.key,
    value: r.value,
    description: r.description,
    updatedAt:
      r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : new Date(Number(r.updatedAt) * 1000).toISOString(),
  }
}

export async function batchUpsertSettings(
  items: Array<{ key: string; value: string; description?: string }>
): Promise<
  Array<{
    id: number
    key: string
    value: string
    description: string | null
    updatedAt: string
  }>
> {
  const results: Array<{
    id: number
    key: string
    value: string
    description: string | null
    updatedAt: string
  }> = []
  for (const item of items) {
    const result = await upsertSetting(item.key, item.value, item.description)
    results.push(result)
  }
  return results
}
