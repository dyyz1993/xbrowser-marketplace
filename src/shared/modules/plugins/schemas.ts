import { z } from '@hono/zod-openapi'

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
  avgRating?: number | null
  reviewCount?: number | null
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

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sortOrder: number | null
  pluginCount: number
}

export interface Review {
  id: string
  pluginId: string
  userId: string
  userName: string
  rating: number
  title: string | null
  content: string | null
  createdAt: number
}

export interface MarketplaceStats {
  totalPlugins: number
  totalDownloads: number
  totalCategories: number
  totalReviews: number
  recentPlugins: PluginListItem[]
}

export interface PluginListResult {
  items: PluginListItem[]
  total: number
  page: number
  limit: number
}

export interface PluginListParams {
  page?: number
  limit?: number
  category?: string
  tag?: string
  sort?: 'newest' | 'popular' | 'most_downloaded' | 'name'
  featured?: boolean
}

export interface SearchParams {
  q: string
  tag?: string
  site?: string
  category?: string
  page?: number
  limit?: number
}

export const PluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  authorName: z.string(),
  version: z.string(),
  status: z.string(),
  downloadCount: z.number(),
  viewCount: z.number(),
  featured: z.boolean(),
  screenshotUrl: z.string().nullable(),
  tags: z.array(z.string()),
  siteUrls: z.array(z.string()),
  commands: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  avgRating: z.number().optional().nullable(),
  reviewCount: z.number().optional().nullable(),
})

export const PluginDetailSchema = PluginSchema.extend({
  authorId: z.string(),
  readme: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  homepageUrl: z.string().nullable(),
  npmPackage: z.string().nullable(),
  license: z.string().nullable(),
  categories: z.array(z.object({ id: z.string(), name: z.string(), slug: z.string() })),
  versions: z.array(
    z.object({
      id: z.string(),
      version: z.string(),
      changelog: z.string().nullable(),
      publishedAt: z.number(),
    })
  ),
})

export const ReviewSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  userName: z.string(),
  rating: z.number(),
  title: z.string().nullable(),
  content: z.string().nullable(),
  createdAt: z.number(),
})

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  sortOrder: z.number().nullable(),
  pluginCount: z.number(),
})

export const CategoryListResponseSchema = z.array(CategorySchema)

export const DbCleanupResultSchema = z.object({
  countsReset: z.object({ reset: z.number() }),
  reviewsCleaned: z.object({ deleted: z.number() }),
})

export const DeveloperSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
})

export const PromoteResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.string(),
})

export const StatsSchema = z.object({
  totalPlugins: z.number(),
  totalDownloads: z.number(),
  totalCategories: z.number(),
  totalReviews: z.number(),
  recentPlugins: z.array(PluginSchema),
})

export const VersionSchema = z.object({
  id: z.string(),
  version: z.string(),
  changelog: z.string().nullable(),
  packageUrl: z.string().nullable(),
  fileSize: z.number().nullable(),
  checksum: z.string().nullable(),
  status: z.string(),
  publishedAt: z.number(),
})

export const PluginListResponseSchema = z.object({
  items: z.array(PluginSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

export const ReviewListResponseSchema = z.object({
  items: z.array(ReviewSchema),
  total: z.number(),
})

export const CategoryPluginListResponseSchema = z.object({
  items: z.array(PluginSchema),
  total: z.number(),
})

export const PluginIdResponseSchema = z.object({ id: z.string() })
export const DownloadCountResponseSchema = z.object({ downloadCount: z.number() })
export const ReviewIdResponseSchema = z.object({ id: z.string() })

export const TokenResponseSchema = z.object({
  token: z.string(),
  profile: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
    createdAt: z.number(),
  }),
})

export const TarballInfoSchema = z.object({ url: z.string() })

export const AdminPluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  version: z.string(),
  status: z.string(),
  downloadCount: z.number(),
  viewCount: z.number(),
  featured: z.boolean(),
  screenshotUrl: z.string().nullable(),
  tags: z.array(z.string()),
  siteUrls: z.array(z.string()),
  commands: z.array(z.string()),
  readme: z.string().nullable(),
  rejectReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const AdminDashboardStatsSchema = z.object({
  totalPlugins: z.number(),
  pendingPlugins: z.number(),
  approvedPlugins: z.number(),
  rejectedPlugins: z.number(),
  totalDownloads: z.number(),
  totalViews: z.number(),
  totalReviews: z.number(),
  activeDevelopers: z.number(),
  recentSubmissions: z.array(AdminPluginSchema),
  pluginsByCategory: z.array(z.object({ category: z.string(), count: z.number() })),
  developerRoles: z.array(z.object({ role: z.string(), count: z.number() })),
})

export const PluginInventoryItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  authorName: z.string(),
  downloadCount: z.number(),
  viewCount: z.number(),
  featured: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryCount: z.number(),
  reviewCount: z.number(),
  avgRating: z.number().nullable(),
})

export const PluginInventoryResponseSchema = z.object({
  plugins: z.array(PluginInventoryItemSchema),
  summary: z.object({
    total: z.number(),
    withDownloads: z.number(),
    withReviews: z.number(),
    featured: z.number(),
  }),
})

export const AdminPluginListResponseSchema = z.object({
  items: z.array(AdminPluginSchema),
  total: z.number(),
})

export const AdminBulkResultSchema = z.object({ approved: z.number() })
export const AdminBulkRejectResultSchema = z.object({ rejected: z.number() })

export const RejectBodySchema = z.object({ reason: z.string().min(1).max(500) })
export const BulkSlugsBodySchema = z.object({ slugs: z.array(z.string()).min(1) })
export const BulkRejectBodySchema = z.object({ slugs: z.array(z.string()).min(1), reason: z.string().optional().nullable() })

export const AdminPluginQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  search: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
})

export const PendingPluginQuerySchema = z.object({
  status: z.string().default('pending'),
  page: z.string().default('1'),
  limit: z.string().default('20'),
})

export const PromoteDeveloperBodySchema = z.object({ email: z.string(), username: z.string() })

export const SlugParamSchema = z.object({ slug: z.string() })
export const IdParamSchema = z.object({ id: z.string() })

export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(200).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
})

export const UpdateCategoryBodySchema = z.object({
  name: z.string().min(1).max(50).optional().nullable(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().optional().nullable(),
})
