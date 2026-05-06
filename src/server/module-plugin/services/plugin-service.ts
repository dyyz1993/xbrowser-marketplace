import { getDb } from '../../db'
import { plugins, pluginVersions } from '../../db/schema'
import type { PluginStatus } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { generateUUID } from '../../utils/uuid'
import { NotFoundError, ConflictError, AuthorizationError } from '../../utils/app-error'
import type { CreatePluginInput, UpdatePluginInput } from '../plugin.types'
import { type PluginRow, serializeJsonField } from './plugin-utils'

export type { PluginListItem, PluginDetail } from './plugin-utils'

export { listPlugins, searchPlugins, getPluginBySlug, getPluginVersions, listCategories, getPluginsByCategory, getStats } from './plugin-query-service'
export { getReviewStatsForPlugin, getReviewStatsBatch, submitReview, getReviews, deleteReview } from './plugin-review-service'

export async function createPlugin(
  data: CreatePluginInput,
  authorId: string,
  authorName: string
) {
  const { getPluginBySlug } = await import('./plugin-query-service')
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
) {
  const { getPluginBySlug } = await import('./plugin-query-service')
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
