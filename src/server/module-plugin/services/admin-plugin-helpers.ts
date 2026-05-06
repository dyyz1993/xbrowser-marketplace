import { plugins } from '../../db/schema'
import { parseJsonField } from '../../utils/json'

type PluginRow = typeof plugins.$inferSelect

export { type PluginRow }

export interface AdminPluginItem {
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

export { toTimestamp }

export function toAdminPluginItem(row: PluginRow): AdminPluginItem {
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
