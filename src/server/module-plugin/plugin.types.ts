import { z } from '@hono/zod-openapi'

export const CreatePluginSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(10).max(500),
  readme: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  homepageUrl: z.string().url().optional(),
  npmPackage: z.string().optional(),
  license: z.string().default('MIT'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  siteUrls: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  screenshotUrl: z.string().url().optional(),
})

export const UpdatePluginSchema = z.object({
  name: z.string().min(1).max(100).optional().nullable(),
  description: z.string().min(10).max(500).optional().nullable(),
  readme: z.string().optional().nullable(),
  repositoryUrl: z.string().url().optional().nullable(),
  homepageUrl: z.string().url().optional().nullable(),
  npmPackage: z.string().optional().nullable(),
  license: z.string().optional().nullable(),
  screenshotUrl: z.string().url().optional().nullable(),
  siteUrls: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  commands: z.array(z.string()).optional().nullable(),
})

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().max(2000).optional(),
})

export const PluginListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  status: z.enum(['pending', 'approved', 'rejected', 'removed']).optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['newest', 'popular', 'most_downloaded', 'name']).default('newest'),
  featured: z.string().optional(),
})

export const PluginSearchQuerySchema = z.object({
  q: z.string().min(1),
  tag: z.string().optional(),
  site: z.string().optional(),
  category: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('20'),
})

export const ReviewListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
})

export const PluginSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
})

export const CategorySlugSchema = z.object({
  slug: z.string(),
})

export const storageTypeSchema = z.enum(['npm', 'r2']).default('r2')

export const PublishMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1),
  author: z.string().optional(),
  commands: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sites: z.array(z.string()).optional().default([]),
  license: z.string().optional().default('MIT'),
  homepageUrl: z.string().optional().nullable(),
  repositoryUrl: z.string().optional().nullable(),
  npmPackage: z.string().optional().nullable(),
  storageType: storageTypeSchema,
})

export const CreateVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  changelog: z.string().max(5000).optional(),
})

export type CreatePluginInput = z.infer<typeof CreatePluginSchema>
export type UpdatePluginInput = z.infer<typeof UpdatePluginSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
export type PluginListQuery = z.infer<typeof PluginListQuerySchema>
export type PluginSearchQuery = z.infer<typeof PluginSearchQuerySchema>
export type ReviewListQuery = z.infer<typeof ReviewListQuerySchema>
export type PublishMetadataInput = z.infer<typeof PublishMetadataSchema>
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>
