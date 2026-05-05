import { getDb } from '../../db'
import {
  plugins,
  pluginVersions,
  pluginReviews,
  pluginCategories,
  pluginCategoryMappings,
  type PluginStatus,
} from '../../db/schema'
import { eq, and, desc, asc, sql, like, or, SQL } from 'drizzle-orm'
import { generateUUID } from '../../utils/uuid'
import { NotFoundError, ConflictError, AuthorizationError } from '../../utils/app-error'
import type { CreatePluginInput, UpdatePluginInput, CreateReviewInput } from '../plugin.types'

function parseJsonField<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

function serializeJsonField(value: string[] | undefined): string | undefined {
  if (!value || value.length === 0) return undefined
  return JSON.stringify(value)
}

export interface PluginListItem {
  id: string
  name: string
  slug: string
  description: string
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
  createdAt: number
  updatedAt: number
  avgRating?: number
  reviewCount?: number
}

export interface PluginDetail extends PluginListItem {
  authorId: string
  readme: string | null
  repositoryUrl: string | null
  homepageUrl: string | null
  npmPackage: string | null
  license: string | null
  categories: { id: string; name: string; slug: string }[]
  versions: { id: string; version: string; changelog: string | null; publishedAt: number }[]
}

type PluginRow = typeof plugins.$inferSelect
type ReviewRow = typeof pluginReviews.$inferSelect
type CategoryRow = typeof pluginCategories.$inferSelect
type MappingRow = typeof pluginCategoryMappings.$inferSelect
type VersionRow = typeof pluginVersions.$inferSelect

function toPluginListItem(row: PluginRow, extra?: { avgRating?: number; reviewCount?: number }): PluginListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
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
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    avgRating: extra?.avgRating,
    reviewCount: extra?.reviewCount,
  }
}

function buildStatusCondition(status?: string): SQL {
  const validStatus: PluginStatus = (status as PluginStatus) ?? 'approved'
  return eq(plugins.status, validStatus)
}

function inList(columnExpr: unknown, ids: string[]): SQL {
  if (ids.length === 1 && ids[0]) return eq(columnExpr as never, ids[0])
  return sql`${columnExpr} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`
}

async function getReviewStatsForPlugin(pluginId: string): Promise<{ avgRating: number; reviewCount: number }> {
  const db = await getDb()
  const allReviews: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(eq(pluginReviews.pluginId, pluginId))
  if (allReviews.length === 0) return { avgRating: 0, reviewCount: 0 }
  const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
  return { avgRating: sum / allReviews.length, reviewCount: allReviews.length }
}

export async function listPlugins(options: {
  page?: number
  limit?: number
  status?: string
  category?: string
  tag?: string
  sort?: string
  featured?: boolean
}): Promise<{ items: PluginListItem[]; total: number }> {
  const db = await getDb()
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const conditions: SQL[] = [buildStatusCondition(options.status)]

  if (options.featured !== undefined) {
    conditions.push(eq(plugins.featured, options.featured))
  }

  if (options.tag) {
    conditions.push(like(plugins.tags, `%"${options.tag}"%`))
  }

  if (options.category) {
    const catRows: CategoryRow[] = await db
      .select()
      .from(pluginCategories)
      .where(eq(pluginCategories.slug, options.category))
      .limit(1)

    if (catRows.length > 0) {
      const mappingRows: MappingRow[] = await db
        .select()
        .from(pluginCategoryMappings)
        .where(eq(pluginCategoryMappings.categoryId, catRows[0].id))

      if (mappingRows.length > 0) {
        conditions.push(inList(plugins.id, mappingRows.map(m => m.pluginId)))
      } else {
        return { items: [], total: 0 }
      }
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  let orderBy: SQL
  switch (options.sort) {
    case 'popular':
    case 'most_downloaded':
      orderBy = desc(plugins.downloadCount)
      break
    case 'name':
      orderBy = asc(plugins.name)
      break
    default:
      orderBy = desc(plugins.createdAt)
      break
  }

  const [rows, countRows] = await Promise.all([
    db.select().from(plugins).where(whereClause).orderBy(orderBy).limit(limit).offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  const items = await Promise.all(
    rows.map(async row => {
      const stats = await getReviewStatsForPlugin(row.id)
      return toPluginListItem(row, stats)
    })
  )

  return { items, total: countRows.length }
}

export async function searchPlugins(options: {
  query: string
  tag?: string
  site?: string
  category?: string
  page?: number
  limit?: number
}): Promise<{ items: PluginListItem[]; total: number }> {
  const db = await getDb()
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const searchTerm = `%${options.query}%`
  const conditions: SQL[] = [
    eq(plugins.status, 'approved'),
    or(
      like(plugins.name, searchTerm),
      like(plugins.description, searchTerm),
      like(plugins.tags, searchTerm)
    )!,
  ]

  if (options.tag) {
    conditions.push(like(plugins.tags, `%"${options.tag}"%`))
  }

  if (options.site) {
    conditions.push(like(plugins.siteUrls, `%"${options.site}"%`))
  }

  if (options.category) {
    const catRows: CategoryRow[] = await db
      .select()
      .from(pluginCategories)
      .where(eq(pluginCategories.slug, options.category))
      .limit(1)

    if (catRows.length > 0) {
      const mappingRows: MappingRow[] = await db
        .select()
        .from(pluginCategoryMappings)
        .where(eq(pluginCategoryMappings.categoryId, catRows[0].id))

      if (mappingRows.length > 0) {
        conditions.push(inList(plugins.id, mappingRows.map(m => m.pluginId)))
      } else {
        return { items: [], total: 0 }
      }
    }
  }

  const whereClause = and(...conditions)

  const [rows, countRows] = await Promise.all([
    db.select().from(plugins).where(whereClause).orderBy(desc(plugins.createdAt)).limit(limit).offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  const items = await Promise.all(
    rows.map(async row => {
      const stats = await getReviewStatsForPlugin(row.id)
      return toPluginListItem(row, stats)
    })
  )

  return { items, total: countRows.length }
}

export async function getPluginBySlug(slug: string): Promise<PluginDetail> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const plugin = pluginRows[0]

  const [versionRows, reviewStats] = await Promise.all([
    db
      .select()
      .from(pluginVersions)
      .where(eq(pluginVersions.pluginId, plugin.id))
      .orderBy(desc(pluginVersions.publishedAt)),
    getReviewStatsForPlugin(plugin.id),
  ])

  const categoryMappings: MappingRow[] = await db
    .select()
    .from(pluginCategoryMappings)
    .where(eq(pluginCategoryMappings.pluginId, plugin.id))

  const catIds = categoryMappings.map(m => m.categoryId)
  let categories: { id: string; name: string; slug: string }[] = []
  if (catIds.length > 0) {
    const catRows: CategoryRow[] = await db
      .select()
      .from(pluginCategories)
      .where(inList(pluginCategories.id, catIds))
    categories = catRows.map(c => ({ id: c.id, name: c.name, slug: c.slug }))
  }

  await db
    .update(plugins)
    .set({ viewCount: sql`${plugins.viewCount} + 1` })
    .where(eq(plugins.id, plugin.id))

  const base = toPluginListItem(plugin, reviewStats)

  return {
    ...base,
    authorId: plugin.authorId,
    readme: plugin.readme,
    repositoryUrl: plugin.repositoryUrl,
    homepageUrl: plugin.homepageUrl,
    npmPackage: plugin.npmPackage,
    license: plugin.license,
    categories,
    versions: versionRows.map((v: VersionRow) => ({
      id: v.id,
      version: v.version,
      changelog: v.changelog,
      publishedAt: v.publishedAt.getTime(),
    })),
  }
}

export async function createPlugin(
  data: CreatePluginInput,
  authorId: string,
  authorName: string
): Promise<PluginDetail> {
  const db = await getDb()

  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, data.slug)).limit(1)

  if (existing.length > 0) {
    throw new ConflictError(`Plugin slug '${data.slug}' already exists`)
  }

  const id = generateUUID()
  const now = new Date()

  await db.insert(plugins).values({
    id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    readme: data.readme ?? null,
    authorId,
    authorName,
    repositoryUrl: data.repositoryUrl ?? null,
    homepageUrl: data.homepageUrl ?? null,
    npmPackage: data.npmPackage ?? null,
    license: data.license ?? 'MIT',
    version: data.version,
    status: 'pending',
    screenshotUrl: data.screenshotUrl ?? null,
    siteUrls: serializeJsonField(data.siteUrls),
    tags: serializeJsonField(data.tags),
    commands: serializeJsonField(data.commands),
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(pluginVersions).values({
    id: generateUUID(),
    pluginId: id,
    version: data.version,
    changelog: null,
    packageUrl: null,
    fileSize: null,
    checksum: null,
    status: 'pending',
    publishedAt: now,
  })

  return getPluginBySlug(data.slug)
}

export async function updatePlugin(
  slug: string,
  data: UpdatePluginInput,
  authorId: string
): Promise<PluginDetail> {
  const db = await getDb()

  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (existing[0].authorId !== authorId) {
    throw new AuthorizationError('Only the plugin author can update this plugin')
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.readme !== undefined) updateData.readme = data.readme
  if (data.repositoryUrl !== undefined) updateData.repositoryUrl = data.repositoryUrl
  if (data.homepageUrl !== undefined) updateData.homepageUrl = data.homepageUrl
  if (data.npmPackage !== undefined) updateData.npmPackage = data.npmPackage
  if (data.license !== undefined) updateData.license = data.license
  if (data.screenshotUrl !== undefined) updateData.screenshotUrl = data.screenshotUrl ?? undefined
  if (data.siteUrls !== undefined) updateData.siteUrls = serializeJsonField(data.siteUrls ?? undefined)
  if (data.tags !== undefined) updateData.tags = serializeJsonField(data.tags ?? undefined)
  if (data.commands !== undefined) updateData.commands = serializeJsonField(data.commands ?? undefined)

  await db.update(plugins).set(updateData).where(eq(plugins.id, existing[0].id))

  return getPluginBySlug(slug)
}

export async function deletePlugin(slug: string, authorId: string): Promise<{ id: string }> {
  const db = await getDb()

  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (existing[0].authorId !== authorId) {
    throw new AuthorizationError('Only the plugin author can delete this plugin')
  }

  await db
    .update(plugins)
    .set({ status: 'removed' satisfies PluginStatus, updatedAt: new Date() })
    .where(eq(plugins.id, existing[0].id))

  return { id: existing[0].id }
}

export async function trackInstall(slug: string): Promise<{ downloadCount: number }> {
  const db = await getDb()

  const existing: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  await db
    .update(plugins)
    .set({
      downloadCount: sql`${plugins.downloadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(plugins.id, existing[0].id))

  const result: PluginRow[] = await db.select().from(plugins).where(eq(plugins.id, existing[0].id)).limit(1)

  return { downloadCount: result[0]?.downloadCount ?? 0 }
}

export async function getPluginVersions(slug: string) {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const rows: VersionRow[] = await db
    .select()
    .from(pluginVersions)
    .where(eq(pluginVersions.pluginId, pluginRows[0].id))
    .orderBy(desc(pluginVersions.publishedAt))

  return rows.map((v: VersionRow) => ({
    id: v.id,
    version: v.version,
    changelog: v.changelog,
    packageUrl: v.packageUrl,
    fileSize: v.fileSize,
    checksum: v.checksum,
    status: v.status,
    publishedAt: v.publishedAt.getTime(),
  }))
}

export async function submitReview(
  slug: string,
  data: CreateReviewInput,
  userId: string,
  userName: string
): Promise<ReviewRow> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (pluginRows[0].status !== 'approved') {
    throw new ConflictError('Cannot review a plugin that is not approved')
  }

  const existingReview: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(and(eq(pluginReviews.pluginId, pluginRows[0].id), eq(pluginReviews.userId, userId)))
    .limit(1)

  if (existingReview.length > 0) {
    throw new ConflictError('You have already reviewed this plugin')
  }

  const id = generateUUID()
  const now = new Date()

  await db.insert(pluginReviews).values({
    id,
    pluginId: pluginRows[0].id,
    userId,
    userName,
    rating: data.rating,
    title: data.title ?? null,
    content: data.content ?? null,
    createdAt: now,
  })

  const rows: ReviewRow[] = await db.select().from(pluginReviews).where(eq(pluginReviews.id, id)).limit(1)

  return rows[0]
}

export async function getReviews(
  slug: string,
  options: { page?: number; limit?: number }
): Promise<{ items: ReviewRow[]; total: number }> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const whereClause = eq(pluginReviews.pluginId, pluginRows[0].id)

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(pluginReviews)
      .where(whereClause)
      .orderBy(desc(pluginReviews.createdAt))
      .limit(limit)
      .offset(offset),
    db.select().from(pluginReviews).where(whereClause),
  ])

  return { items, total: countRows.length }
}

export async function listCategories() {
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

export async function getPluginsByCategory(
  categorySlug: string,
  options: { page?: number; limit?: number }
): Promise<{ items: PluginListItem[]; total: number }> {
  const db = await getDb()

  const catRows: CategoryRow[] = await db
    .select()
    .from(pluginCategories)
    .where(eq(pluginCategories.slug, categorySlug))
    .limit(1)

  if (catRows.length === 0) {
    throw new NotFoundError('Category', categorySlug)
  }

  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const offset = (page - 1) * limit

  const mappingRows: MappingRow[] = await db
    .select()
    .from(pluginCategoryMappings)
    .where(eq(pluginCategoryMappings.categoryId, catRows[0].id))

  if (mappingRows.length === 0) {
    return { items: [], total: 0 }
  }

  const ids = mappingRows.map(m => m.pluginId)
  const whereClause = and(inList(plugins.id, ids), eq(plugins.status, 'approved'))

  const [rows, countRows] = await Promise.all([
    db.select().from(plugins).where(whereClause).orderBy(desc(plugins.downloadCount)).limit(limit).offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  const items = await Promise.all(
    rows.map(async row => {
      const stats = await getReviewStatsForPlugin(row.id)
      return toPluginListItem(row, stats)
    })
  )

  return { items, total: countRows.length }
}

export async function getStats() {
  const db = await getDb()

  const approvedWhere = eq(plugins.status, 'approved')

  const approvedPlugins: PluginRow[] = await db.select().from(plugins).where(approvedWhere)
  const totalPlugins = approvedPlugins.length
  const totalDownloads = approvedPlugins.reduce((sum, p) => sum + (p.downloadCount ?? 0), 0)

  const allCategories: CategoryRow[] = await db.select().from(pluginCategories)
  const allReviews: ReviewRow[] = await db.select().from(pluginReviews)

  const recentPluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(approvedWhere)
    .orderBy(desc(plugins.createdAt))
    .limit(5)

  const recentWithStats = await Promise.all(
    recentPluginRows.map(async row => {
      const stats = await getReviewStatsForPlugin(row.id)
      return toPluginListItem(row, stats)
    })
  )

  return {
    totalPlugins,
    totalDownloads,
    totalCategories: allCategories.length,
    totalReviews: allReviews.length,
    recentPlugins: recentWithStats,
  }
}

export async function deleteReview(
  slug: string,
  reviewId: string,
  userId: string,
  userRole: string
): Promise<{ id: string }> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db.select().from(plugins).where(eq(plugins.slug, slug)).limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const reviewRows: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(and(eq(pluginReviews.id, reviewId), eq(pluginReviews.pluginId, pluginRows[0].id)))
    .limit(1)

  if (reviewRows.length === 0) {
    throw new NotFoundError('Review', reviewId)
  }

  const isAdmin = userRole === 'super_admin' || userRole === 'customer_service'
  if (reviewRows[0].userId !== userId && !isAdmin) {
    throw new AuthorizationError('Only the review author or admin can delete this review')
  }

  await db.delete(pluginReviews).where(eq(pluginReviews.id, reviewId))

  return { id: reviewId }
}
