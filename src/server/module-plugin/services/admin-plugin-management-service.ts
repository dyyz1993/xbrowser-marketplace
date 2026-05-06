import { getDb } from '../../db'
import { plugins } from '../../db/schema'
import type { PluginStatus } from '../../db/schema'
import { eq, and, desc, sql, SQL } from 'drizzle-orm'
import { NotFoundError, BusinessError } from '../../utils/app-error'
import { toAdminPluginItem, type AdminPluginItem, type PluginRow } from './admin-plugin-helpers'

export async function listPendingPlugins(options: {
  status?: string
  page?: number
  limit?: number
}): Promise<{ items: AdminPluginItem[]; total: number }> {
  const db = await getDb()
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const conditions: SQL[] = []
  if (options.status && options.status !== 'all') {
    conditions.push(eq(plugins.status, options.status as PluginStatus))
  } else {
    conditions.push(sql`${plugins.status} IN ('pending', 'approved', 'rejected')`)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(plugins)
      .where(whereClause)
      .orderBy(desc(plugins.createdAt))
      .limit(limit)
      .offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  return {
    items: rows.map(toAdminPluginItem),
    total: countRows.length,
  }
}

export async function approvePlugin(slug: string, _adminId: string): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (existing[0].status === 'approved') {
    throw BusinessError.invalidState('approved', ['pending'])
  }

  await db
    .update(plugins)
    .set({ status: 'approved' satisfies PluginStatus, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  const updated: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.id, existing[0].id))
    .limit(1)
  return toAdminPluginItem(updated[0])
}

export async function rejectPlugin(
  slug: string,
  reason: string,
  _adminId: string
): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (existing[0].status === 'rejected') {
    throw BusinessError.invalidState('rejected', ['pending'])
  }

  await db
    .update(plugins)
    .set({ status: 'rejected' satisfies PluginStatus, rejectReason: reason, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  const updated: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.id, existing[0].id))
    .limit(1)
  return toAdminPluginItem(updated[0])
}

export async function toggleFeatured(slug: string): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (existing[0].status !== 'approved') {
    throw BusinessError.operationNotAllowed('Only approved plugins can be featured')
  }

  const newFeatured = !existing[0].featured

  await db
    .update(plugins)
    .set({ featured: newFeatured, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  const updated: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.id, existing[0].id))
    .limit(1)
  return toAdminPluginItem(updated[0])
}

export async function adminRemovePlugin(slug: string): Promise<{ id: string }> {
  const db = await getDb()
  const existing: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  await db
    .update(plugins)
    .set({ status: 'removed' satisfies PluginStatus, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  return { id: existing[0].id }
}

export async function adminListAllPlugins(options: {
  page?: number
  limit?: number
  search?: string | null
  status?: string | null
}): Promise<{ items: AdminPluginItem[]; total: number }> {
  const db = await getDb()
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const conditions: SQL[] = [sql`${plugins.status} != 'removed'`]

  if (options.status && options.status !== 'all') {
    conditions.push(eq(plugins.status, options.status as PluginStatus))
  }

  if (options.search) {
    const term = `%${options.search}%`
    conditions.push(
      sql`(${plugins.name} LIKE ${term} OR ${plugins.slug} LIKE ${term} OR ${plugins.authorName} LIKE ${term})`
    )
  }

  const whereClause = and(...conditions)

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(plugins)
      .where(whereClause)
      .orderBy(desc(plugins.createdAt))
      .limit(limit)
      .offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  return {
    items: rows.map(toAdminPluginItem),
    total: countRows.length,
  }
}
