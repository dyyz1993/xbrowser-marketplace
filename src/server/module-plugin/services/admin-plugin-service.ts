import { getDb } from '../../db'
import { plugins, pluginCategories, pluginCategoryMappings, pluginReviews, developers } from '../../db/schema'
import type { PluginStatus } from '../../db/schema'
import { eq, and, desc, asc, sql, SQL } from 'drizzle-orm'
import { NotFoundError, BusinessError } from '../../utils/app-error'
import { generateUUID } from '../../utils/uuid'
import { parseJsonField } from '../../utils/json'

type PluginRow = typeof plugins.$inferSelect
type CategoryRow = typeof pluginCategories.$inferSelect
type MappingRow = typeof pluginCategoryMappings.$inferSelect

interface AdminPluginItem {
  id: string
  name: string
  slug: string
  description: string
  authorId: string
  authorName: string
  version: string
  status: string
  downloadCount: number
  viewCount: number
  featured: boolean
  screenshotUrl: string | null
  tags: string[]
  siteUrls: string[]
  commands: string[]
  readme: string | null
  rejectReason: string | null
  createdAt: number
  updatedAt: number
}

function toTimestamp(value: Date | number | null | undefined): number {
  if (!value) return 0
  if (typeof value === 'number') return value
  return value.getTime()
}

function toAdminPluginItem(row: PluginRow): AdminPluginItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    authorId: row.authorId,
    authorName: row.authorName,
    version: row.version,
    status: row.status,
    downloadCount: row.downloadCount ?? 0,
    viewCount: row.viewCount ?? 0,
    featured: row.featured ?? false,
    screenshotUrl: row.screenshotUrl,
    tags: parseJsonField<string[]>(row.tags) ?? [],
    siteUrls: parseJsonField<string[]>(row.siteUrls) ?? [],
    commands: parseJsonField<string[]>(row.commands) ?? [],
    readme: row.readme,
    rejectReason: row.rejectReason ?? null,
    createdAt: toTimestamp(row.createdAt),
    updatedAt: toTimestamp(row.updatedAt),
  }
}

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
    db.select().from(plugins).where(whereClause).orderBy(desc(plugins.createdAt)).limit(limit).offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  return {
    items: rows.map(toAdminPluginItem),
    total: countRows.length,
  }
}

export async function approvePlugin(slug: string, _adminId: string): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

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

  const updated: PluginRow[] = await db.select().from(plugins).where(eq(plugins.id, existing[0].id)).limit(1)
  return toAdminPluginItem(updated[0])
}

export async function rejectPlugin(
  slug: string,
  reason: string,
  _adminId: string
): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

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

  const updated: PluginRow[] = await db.select().from(plugins).where(eq(plugins.id, existing[0].id)).limit(1)
  return toAdminPluginItem(updated[0])
}

export async function toggleFeatured(slug: string): Promise<AdminPluginItem> {
  const db = await getDb()
  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

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

  const updated: PluginRow[] = await db.select().from(plugins).where(eq(plugins.id, existing[0].id)).limit(1)
  return toAdminPluginItem(updated[0])
}

export async function adminRemovePlugin(slug: string): Promise<{ id: string }> {
  const db = await getDb()
  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  await db
    .update(plugins)
    .set({ status: 'removed' satisfies PluginStatus, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  return { id: existing[0].id }
}

export async function getDashboardStats() {
  const db = await getDb()

  const allPlugins: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(sql`${plugins.status} != 'removed'`)

  const pendingPlugins = allPlugins.filter(p => p.status === 'pending').length
  const approvedPlugins = allPlugins.filter(p => p.status === 'approved')
  const rejectedPlugins = allPlugins.filter(p => p.status === 'rejected').length
  const totalPlugins = allPlugins.length
  const totalDownloads = approvedPlugins.reduce((sum, p) => sum + (p.downloadCount ?? 0), 0)
  const totalViews = allPlugins.reduce((sum, p) => sum + (p.viewCount ?? 0), 0)
  const activeDevelopers = new Set(approvedPlugins.map(p => p.authorId)).size

  const allReviews = await db.select().from(pluginReviews)
  const totalReviews = allReviews.length

  const allCategoryMappings = await db.select().from(pluginCategoryMappings)
  const allCategories = await db.select().from(pluginCategories)

  const approvedPluginIds = new Set(approvedPlugins.map(p => p.id))
  const catPluginCounts = new Map<string, number>()
  for (const m of allCategoryMappings) {
    if (approvedPluginIds.has(m.pluginId)) {
      const cat = allCategories.find(c => c.id === m.categoryId)
      const catName = cat?.name ?? 'uncategorized'
      catPluginCounts.set(catName, (catPluginCounts.get(catName) ?? 0) + 1)
    }
  }
  const pluginsByCategory = Array.from(catPluginCounts.entries()).map(([category, count]) => ({ category, count }))

  const allDevelopers = await db.select().from(developers)
  const roleCounts = new Map<string, number>()
  for (const d of allDevelopers) {
    roleCounts.set(d.role, (roleCounts.get(d.role) ?? 0) + 1)
  }
  const developerRoles = Array.from(roleCounts.entries()).map(([role, count]) => ({ role, count }))

  const recentRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(sql`${plugins.status} IN ('pending', 'approved', 'rejected')`)
    .orderBy(desc(plugins.createdAt))
    .limit(10)

  return {
    totalPlugins,
    pendingPlugins,
    approvedPlugins: approvedPlugins.length,
    rejectedPlugins,
    totalDownloads,
    totalViews,
    totalReviews,
    activeDevelopers,
    recentSubmissions: recentRows.map(toAdminPluginItem),
    pluginsByCategory,
    developerRoles,
  }
}

export async function getPluginInventory() {
  const db = await getDb()

  const allPlugins: PluginRow[] = await db.select().from(plugins).where(sql`${plugins.status} != 'removed'`)

  const allMappings = await db.select().from(pluginCategoryMappings)
  const allReviews = await db.select().from(pluginReviews)

  const catCountByPlugin = new Map<string, number>()
  for (const m of allMappings) {
    catCountByPlugin.set(m.pluginId, (catCountByPlugin.get(m.pluginId) ?? 0) + 1)
  }

  const reviewStatsByPlugin = new Map<string, { count: number; totalRating: number }>()
  for (const r of allReviews) {
    const existing = reviewStatsByPlugin.get(r.pluginId) ?? { count: 0, totalRating: 0 }
    existing.count++
    existing.totalRating += r.rating
    reviewStatsByPlugin.set(r.pluginId, existing)
  }

  const pluginItems = allPlugins.map(p => {
    const stats = reviewStatsByPlugin.get(p.id)
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      authorName: p.authorName,
      downloadCount: p.downloadCount ?? 0,
      viewCount: p.viewCount ?? 0,
      featured: p.featured ?? false,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      categoryCount: catCountByPlugin.get(p.id) ?? 0,
      reviewCount: stats?.count ?? 0,
      avgRating: stats ? Math.round((stats.totalRating / stats.count) * 100) / 100 : null,
    }
  })

  return {
    plugins: pluginItems,
    summary: {
      total: pluginItems.length,
      withDownloads: pluginItems.filter(p => p.downloadCount > 0).length,
      withReviews: pluginItems.filter(p => p.reviewCount > 0).length,
      featured: pluginItems.filter(p => p.featured).length,
    },
  }
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
    conditions.push(sql`(${plugins.name} LIKE ${term} OR ${plugins.slug} LIKE ${term} OR ${plugins.authorName} LIKE ${term})`)
  }

  const whereClause = and(...conditions)

  const [rows, countRows] = await Promise.all([
    db.select().from(plugins).where(whereClause).orderBy(desc(plugins.createdAt)).limit(limit).offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  return {
    items: rows.map(toAdminPluginItem),
    total: countRows.length,
  }
}

export async function createCategory(data: {
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  sortOrder?: number | null
}) {
  const db = await getDb()
  const id = generateUUID()

  await db.insert(pluginCategories).values({
    id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    icon: data.icon ?? null,
    sortOrder: data.sortOrder ?? 0,
  })

  const rows: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)
  return { ...rows[0], pluginCount: 0 }
}

export async function updateCategory(
  id: string,
  data: { name?: string | null; slug?: string | null; description?: string | null; icon?: string | null; sortOrder?: number | null }
) {
  const db = await getDb()
  const existing: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Category', id)
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.slug !== undefined) updateData.slug = data.slug
  if (data.description !== undefined) updateData.description = data.description
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  await db.update(pluginCategories).set(updateData).where(eq(pluginCategories.id, id))

  const rows: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)
  return { ...rows[0], pluginCount: 0 }
}

export async function deleteCategory(id: string): Promise<{ id: string }> {
  const db = await getDb()
  const existing: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Category', id)
  }

  await db.delete(pluginCategoryMappings).where(eq(pluginCategoryMappings.categoryId, id))
  await db.delete(pluginCategories).where(eq(pluginCategories.id, id))

  return { id }
}

export async function resetSeedPluginCounts(slugs: string[]): Promise<{ reset: number }> {
  const db = await getDb()
  let reset = 0
  for (const slug of slugs) {
    await db
      .update(plugins)
      .set({ downloadCount: 0, viewCount: 0, updatedAt: new Date() })
      .where(eq(plugins.slug, slug))
    reset++
  }
  return { reset }
}

export async function cleanupTestReviews(): Promise<{ deleted: number }> {
  const db = await getDb()
  const testNames = ['e2e-tester', 'e2e-full-test']
  let deleted = 0
  for (const name of testNames) {
    await db.delete(pluginReviews).where(sql`${pluginReviews.userName} = ${name}`)
    deleted++
  }
  return { deleted }
}

export async function promoteToAdmin(email: string, newUsername: string): Promise<{ id: string; username: string; role: string }> {
  const db = await getDb()
  const rows = await db.select().from(developers).where(sql`${developers.email} = ${email}`).limit(1)
  if (rows.length === 0) {
    throw new NotFoundError('Developer', email)
  }
  await db
    .update(developers)
    .set({ role: 'super_admin', username: newUsername, updatedAt: new Date() })
    .where(eq(developers.id, rows[0].id))
  return { id: rows[0].id, username: newUsername, role: 'super_admin' }
}

export async function listAllDevelopers(): Promise<Array<{ id: string; username: string; email: string; role: string }>> {
  const db = await getDb()
  const rows = await db.select().from(developers)
  return rows.map(r => ({ id: r.id, username: r.username, email: r.email, role: r.role }))
}

export async function listCategoriesAdmin() {
  const db = await getDb()

  const cats: CategoryRow[] = await db
    .select()
    .from(pluginCategories)
    .orderBy(asc(pluginCategories.sortOrder), asc(pluginCategories.name))

  const mappingRows: MappingRow[] = await db.select().from(pluginCategoryMappings)

  const countMap = new Map<string, number>()
  for (const m of mappingRows) {
    countMap.set(m.categoryId, (countMap.get(m.categoryId) ?? 0) + 1)
  }

  return cats.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    sortOrder: c.sortOrder,
    pluginCount: countMap.get(c.id) ?? 0,
  }))
}
