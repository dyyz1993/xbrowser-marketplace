import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse, success, created } from '../../utils/route-helpers'
import {
  PluginDetailSchema,
  PluginListResponseSchema,
  VersionSchema,
  ReviewSchema,
  ReviewListResponseSchema,
  CategorySchema,
  CategoryPluginListResponseSchema,
  StatsSchema,
  PluginIdResponseSchema,
  DownloadCountResponseSchema,
} from '@shared/modules/plugins'
import {
  CreatePluginSchema,
  UpdatePluginSchema,
  CreateReviewSchema,
  PluginListQuerySchema,
  PluginSearchQuerySchema,
  ReviewListQuerySchema,
  PluginSlugSchema,
  CategorySlugSchema,
} from '../plugin.types'
import * as pluginService from '../services/plugin-service'

const listPluginsRoute = createRoute({
  method: 'get',
  path: '/plugins',
  tags: ['plugins'],
  request: { query: PluginListQuerySchema },
  responses: {
    200: successResponse(PluginListResponseSchema, 'List plugins'),
  },
})

const searchPluginsRoute = createRoute({
  method: 'get',
  path: '/plugins/search',
  tags: ['plugins'],
  request: { query: PluginSearchQuerySchema },
  responses: {
    200: successResponse(PluginListResponseSchema, 'Search plugins'),
  },
})

const getPluginRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginDetailSchema, 'Get plugin detail'),
    404: errorResponse('Plugin not found'),
  },
})

const getPluginVersionsRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}/versions',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(z.array(VersionSchema), 'Get plugin versions'),
    404: errorResponse('Plugin not found'),
  },
})

const createPluginRoute = createRoute({
  method: 'post',
  path: '/plugins',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    body: { content: { 'application/json': { schema: CreatePluginSchema } } },
  },
  responses: {
    201: successResponse(PluginDetailSchema, 'Plugin created'),
    409: errorResponse('Plugin slug already exists'),
  },
})

const updatePluginRoute = createRoute({
  method: 'put',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: UpdatePluginSchema } } },
  },
  responses: {
    200: successResponse(PluginDetailSchema, 'Plugin updated'),
    404: errorResponse('Plugin not found'),
    409: errorResponse('Only author can update'),
  },
})

const deletePluginRoute = createRoute({
  method: 'delete',
  path: '/plugins/{slug}',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(PluginIdResponseSchema, 'Plugin removed'),
    404: errorResponse('Plugin not found'),
  },
})

const submitReviewRoute = createRoute({
  method: 'post',
  path: '/plugins/{slug}/reviews',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: CreateReviewSchema } } },
  },
  responses: {
    201: successResponse(ReviewSchema, 'Review submitted'),
    404: errorResponse('Plugin not found'),
  },
})

const getReviewsRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}/reviews',
  tags: ['plugins'],
  request: {
    params: PluginSlugSchema,
    query: ReviewListQuerySchema,
  },
  responses: {
    200: successResponse(ReviewListResponseSchema, 'Get reviews'),
    404: errorResponse('Plugin not found'),
  },
})

const trackInstallRoute = createRoute({
  method: 'post',
  path: '/plugins/{slug}/install',
  tags: ['plugins'],
  request: { params: PluginSlugSchema },
  responses: {
    200: successResponse(DownloadCountResponseSchema, 'Install tracked'),
    404: errorResponse('Plugin not found'),
  },
})

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/categories',
  tags: ['categories'],
  responses: {
    200: successResponse(z.array(CategorySchema), 'List categories'),
  },
})

const getCategoryPluginsRoute = createRoute({
  method: 'get',
  path: '/categories/{slug}/plugins',
  tags: ['categories'],
  request: {
    params: CategorySlugSchema,
    query: z.object({ page: z.string().default('1'), limit: z.string().default('20') }),
  },
  responses: {
    200: successResponse(CategoryPluginListResponseSchema, 'Get plugins by category'),
    404: errorResponse('Category not found'),
  },
})

const getStatsRoute = createRoute({
  method: 'get',
  path: '/stats',
  tags: ['stats'],
  responses: {
    200: successResponse(StatsSchema, 'Marketplace stats'),
  },
})

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed
}

export const pluginRoutes = new OpenAPIHono()
  .openapi(listPluginsRoute, async c => {
    const query = c.req.valid('query')
    const page = parsePositiveInt(query.page, 1)
    const limit = parsePositiveInt(query.limit, 20)
    const result = await pluginService.listPlugins({
      page,
      limit,
      status: query.status,
      category: query.category,
      tag: query.tag,
      sort: query.sort,
      featured: query.featured === 'true' ? true : query.featured === 'false' ? false : undefined,
    })
    return c.json(success({ ...result, page, limit }), 200)
  })
  .openapi(searchPluginsRoute, async c => {
    const query = c.req.valid('query')
    const page = parsePositiveInt(query.page, 1)
    const limit = parsePositiveInt(query.limit, 20)
    const result = await pluginService.searchPlugins({
      query: query.q,
      tag: query.tag,
      site: query.site,
      category: query.category,
      page,
      limit,
    })
    return c.json(success({ ...result, page, limit }), 200)
  })
  .openapi(getPluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await pluginService.getPluginBySlug(slug)
    return c.json(success(plugin), 200)
  })
  .openapi(getPluginVersionsRoute, async c => {
    const { slug } = c.req.valid('param')
    const versions = await pluginService.getPluginVersions(slug)
    return c.json(success(versions), 200)
  })
  .openapi(createPluginRoute, async c => {
    const data = c.req.valid('json')
    const user = c.get('authUser')
    const plugin = await pluginService.createPlugin(data, user.id, user.username)
    return c.json(created(plugin), 201)
  })
  .openapi(updatePluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const data = c.req.valid('json')
    const user = c.get('authUser')
    const plugin = await pluginService.updatePlugin(slug, data, user.id)
    return c.json(success(plugin), 200)
  })
  .openapi(deletePluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const user = c.get('authUser')
    const result = await pluginService.deletePlugin(slug, user.id)
    return c.json(success(result), 200)
  })
  .openapi(submitReviewRoute, async c => {
    const { slug } = c.req.valid('param')
    const data = c.req.valid('json')
    const user = c.get('authUser')
    const review = await pluginService.submitReview(slug, data, user.id, user.username)
    return c.json(created({ ...review, createdAt: review.createdAt.getTime() }), 201)
  })
  .openapi(getReviewsRoute, async c => {
    const { slug } = c.req.valid('param')
    const query = c.req.valid('query')
    const result = await pluginService.getReviews(slug, {
      page: parsePositiveInt(query.page, 1),
      limit: parsePositiveInt(query.limit, 20),
    })
    return c.json(
      success({
        ...result,
        items: result.items.map(r => ({ ...r, createdAt: r.createdAt.getTime() })),
      }),
      200
    )
  })
  .openapi(trackInstallRoute, async c => {
    const { slug } = c.req.valid('param')
    const result = await pluginService.trackInstall(slug)
    return c.json(success(result), 200)
  })
  .openapi(listCategoriesRoute, async c => {
    const categories = await pluginService.listCategories()
    return c.json(success(categories), 200)
  })
  .openapi(getCategoryPluginsRoute, async c => {
    const { slug } = c.req.valid('param')
    const query = c.req.valid('query')
    const result = await pluginService.getPluginsByCategory(slug, {
      page: parsePositiveInt(query.page, 1),
      limit: parsePositiveInt(query.limit, 20),
    })
    return c.json(success(result), 200)
  })
  .openapi(getStatsRoute, async c => {
    const stats = await pluginService.getStats()
    return c.json(success(stats), 200)
  })
