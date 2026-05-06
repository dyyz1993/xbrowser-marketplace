import { plugins, type PluginStatus } from '../../db/schema'
import { eq, sql, type SQL } from 'drizzle-orm'
import { parseJsonField, serializeJsonField } from '../../utils/json'
export { parseJsonField, serializeJsonField }

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

export type PluginRow = typeof plugins.$inferSelect

export function toPluginListItem(
  row: PluginRow,
  extra?: { avgRating?: number; reviewCount?: number }
): PluginListItem {
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

export function buildStatusCondition(status?: string): SQL {
  const validStatus: PluginStatus = (status as PluginStatus) ?? 'approved'
  return eq(plugins.status, validStatus)
}

export function inList(columnExpr: unknown, ids: string[]): SQL {
  if (ids.length === 1 && ids[0]) return eq(columnExpr as never, ids[0])
  return sql`${columnExpr} IN (${sql.join(
    ids.map(id => sql`${id}`),
    sql`, `
  )})`
}
