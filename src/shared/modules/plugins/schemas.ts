import { z } from '@hono/zod-openapi'

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
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const AdminDashboardStatsSchema = z.object({
  totalPlugins: z.number(),
  pendingPlugins: z.number(),
  approvedPlugins: z.number(),
  totalDownloads: z.number(),
  activeDevelopers: z.number(),
  recentSubmissions: z.array(AdminPluginSchema),
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
