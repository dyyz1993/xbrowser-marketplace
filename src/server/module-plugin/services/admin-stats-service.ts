import { getDb } from '../../db'
import { plugins, pluginCategories, pluginCategoryMappings, pluginReviews, developers } from '../../db/schema'
import { desc, sql } from 'drizzle-orm'
import { toAdminPluginItem, type PluginRow } from './admin-plugin-helpers'

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
