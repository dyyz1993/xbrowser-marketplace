import { getDb } from '../../db'
import {
  plugins,
  pluginVersions,
  pluginReviews,
  pluginCategories,
  pluginCategoryMappings,
} from '../../db/schema'
import { eq, and, desc, asc, like, or, sql, type SQL } from 'drizzle-orm'
import { NotFoundError } from '../../utils/app-error'
import {
  type PluginListItem,
  type PluginDetail,
  type PluginRow,
  toPluginListItem,
  buildStatusCondition,
  inList,
} from './plugin-utils'
import { getReviewStatsForPlugin, getReviewStatsBatch } from './plugin-review-service'

type CategoryRow = typeof pluginCategories.$inferSelect
type MappingRow = typeof pluginCategoryMappings.$inferSelect
type VersionRow = typeof pluginVersions.$inferSelect

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
        conditions.push(
          inList(
            plugins.id,
            mappingRows.map(m => m.pluginId)
          )
        )
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

  const statsMap = await getReviewStatsBatch(rows.map(r => r.id))
  const items = rows.map(row => {
    const stats = statsMap.get(row.id) ?? { avgRating: 0, reviewCount: 0 }
    return toPluginListItem(row, stats)
  })

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
        conditions.push(
          inList(
            plugins.id,
            mappingRows.map(m => m.pluginId)
          )
        )
      } else {
        return { items: [], total: 0 }
      }
    }
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

  const statsMap = await getReviewStatsBatch(rows.map(r => r.id))
  const items = rows.map(row => {
    const stats = statsMap.get(row.id) ?? { avgRating: 0, reviewCount: 0 }
    return toPluginListItem(row, stats)
  })

  return { items, total: countRows.length }
}

export async function getPluginBySlug(slug: string): Promise<PluginDetail> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

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

export async function getPluginVersions(slug: string) {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

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
    db
      .select()
      .from(plugins)
      .where(whereClause)
      .orderBy(desc(plugins.downloadCount))
      .limit(limit)
      .offset(offset),
    db.select().from(plugins).where(whereClause),
  ])

  const statsMap = await getReviewStatsBatch(rows.map(r => r.id))
  const items = rows.map(row => {
    const stats = statsMap.get(row.id) ?? { avgRating: 0, reviewCount: 0 }
    return toPluginListItem(row, stats)
  })

  return { items, total: countRows.length }
}

export async function getStats() {
  const db = await getDb()

  const approvedWhere = eq(plugins.status, 'approved')

  const approvedPlugins: PluginRow[] = await db.select().from(plugins).where(approvedWhere)
  const totalPlugins = approvedPlugins.length
  const totalDownloads = approvedPlugins.reduce((sum, p) => sum + (p.downloadCount ?? 0), 0)

  const allCategories: CategoryRow[] = await db.select().from(pluginCategories)
  const allReviews = await db.select().from(pluginReviews)

  const recentPluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(approvedWhere)
    .orderBy(desc(plugins.createdAt))
    .limit(5)

  const statsMap = await getReviewStatsBatch(recentPluginRows.map(r => r.id))
  const recentWithStats = recentPluginRows.map(row => {
    const stats = statsMap.get(row.id) ?? { avgRating: 0, reviewCount: 0 }
    return toPluginListItem(row, stats)
  })

  return {
    totalPlugins,
    totalDownloads,
    totalCategories: allCategories.length,
    totalReviews: allReviews.length,
    recentPlugins: recentWithStats,
  }
}
