import { getDb } from '../../db'
import { plugins, pluginReviews } from '../../db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { NotFoundError, ConflictError, AuthorizationError } from '../../utils/app-error'
import { generateUUID } from '../../utils/uuid'
import type { CreateReviewInput } from '../plugin.types'
import type { PluginRow } from './plugin-utils'

type ReviewRow = typeof pluginReviews.$inferSelect

export async function getReviewStatsForPlugin(
  pluginId: string
): Promise<{ avgRating: number; reviewCount: number }> {
  const db = await getDb()
  const allReviews: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(eq(pluginReviews.pluginId, pluginId))
  if (allReviews.length === 0) return { avgRating: 0, reviewCount: 0 }
  const sum = allReviews.reduce((acc, r) => acc + r.rating, 0)
  return { avgRating: sum / allReviews.length, reviewCount: allReviews.length }
}

export async function getReviewStatsBatch(
  pluginIds: string[]
): Promise<Map<string, { avgRating: number; reviewCount: number }>> {
  if (pluginIds.length === 0) return new Map()
  const db = await getDb()
  const idSet = new Set(pluginIds)
  const allReviews: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(inArray(pluginReviews.pluginId, pluginIds))

  const grouped = new Map<string, { sum: number; count: number }>()
  for (const r of allReviews) {
    const entry = grouped.get(r.pluginId) ?? { sum: 0, count: 0 }
    entry.sum += r.rating
    entry.count += 1
    grouped.set(r.pluginId, entry)
  }

  const result = new Map<string, { avgRating: number; reviewCount: number }>()
  for (const id of idSet) {
    const entry = grouped.get(id)
    result.set(
      id,
      entry
        ? { avgRating: entry.sum / entry.count, reviewCount: entry.count }
        : { avgRating: 0, reviewCount: 0 }
    )
  }
  return result
}

export async function submitReview(
  slug: string,
  data: CreateReviewInput,
  userId: string,
  userName: string
): Promise<ReviewRow> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

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

  const rows: ReviewRow[] = await db
    .select()
    .from(pluginReviews)
    .where(eq(pluginReviews.id, id))
    .limit(1)

  return rows[0]
}

export async function getReviews(
  slug: string,
  options: { page?: number; limit?: number }
): Promise<{ items: ReviewRow[]; total: number }> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

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

export async function deleteReview(
  slug: string,
  reviewId: string,
  userId: string,
  userRole: string
): Promise<{ id: string }> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

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
