/**
 * @framework-baseline a1b2c3d4e5f67890
 * @framework-modify
 * @reason Admin plugin management routes for marketplace
 */

import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware } from '../../middleware/auth'
import { Role } from '@shared/modules/permission'
import { successResponse, errorResponse, success } from '../../utils/route-helpers'
import {
  AdminPluginSchema,
  AdminDashboardStatsSchema,
  AdminPluginListResponseSchema,
  AdminBulkResultSchema,
  AdminBulkRejectResultSchema,
  CategorySchema,
  CategoryListResponseSchema,
  DbCleanupResultSchema,
  DeveloperSchema,
  PromoteResultSchema,
  RejectBodySchema,
  BulkSlugsBodySchema,
  BulkRejectBodySchema,
  AdminPluginQuerySchema,
  PendingPluginQuerySchema,
  SlugParamSchema,
  IdParamSchema,
  CreateCategoryBodySchema,
  UpdateCategoryBodySchema,
  PluginIdResponseSchema,
  PluginInventoryResponseSchema,
  PromoteDeveloperBodySchema,
} from '@shared/modules/plugins'
import * as adminService from '../services/admin-plugin-service'
import { parsePositiveInt } from '../../utils/parse'

const adminAuth = authMiddleware({ requiredRole: Role.SUPER_ADMIN })
const adminOrDevAuth = authMiddleware({ requiredRole: Role.SUPER_ADMIN })

const dbCleanupRoute = createRoute({
  method: 'post',
  path: '/admin/db/cleanup',
  tags: ['admin-maintenance'],
  security: [{ Bearer: [] }],
  middleware: [adminOrDevAuth],
  responses: {
    200: successResponse(DbCleanupResultSchema, 'Cleanup result'),
  },
})

const listDevelopersRoute = createRoute({
  method: 'get',
  path: '/admin/developers',
  tags: ['admin-maintenance'],
  security: [{ Bearer: [] }],
  middleware: [adminOrDevAuth],
  responses: {
    200: successResponse(z.array(DeveloperSchema), 'List developers'),
  },
})

const promoteDeveloperRoute = createRoute({
  method: 'post',
  path: '/admin/developers/promote',
  tags: ['admin-maintenance'],
  security: [{ Bearer: [] }],
  middleware: [adminOrDevAuth],
  request: {
    body: { content: { 'application/json': { schema: PromoteDeveloperBodySchema } } },
  },
  responses: {
    200: successResponse(PromoteResultSchema, 'Promote developer'),
  },
})

const getDashboardRoute = createRoute({
  method: 'get',
  path: '/admin/stats/dashboard',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  responses: {
    200: successResponse(AdminDashboardStatsSchema, 'Dashboard stats'),
  },
})

const getInventoryRoute = createRoute({
  method: 'get',
  path: '/admin/stats/inventory',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  responses: {
    200: successResponse(PluginInventoryResponseSchema, 'Plugin inventory'),
  },
})

const getPendingRoute = createRoute({
  method: 'get',
  path: '/admin/plugins/pending',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { query: PendingPluginQuerySchema },
  responses: {
    200: successResponse(AdminPluginListResponseSchema, 'List pending plugins'),
  },
})

const listAllPluginsRoute = createRoute({
  method: 'get',
  path: '/admin/plugins',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { query: AdminPluginQuerySchema },
  responses: {
    200: successResponse(AdminPluginListResponseSchema, 'List all plugins'),
  },
})

const approveRoute = createRoute({
  method: 'put',
  path: '/admin/plugins/{slug}/approve',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { params: SlugParamSchema },
  responses: {
    200: successResponse(AdminPluginSchema, 'Plugin approved'),
    404: errorResponse('Plugin not found'),
  },
})

const rejectRoute = createRoute({
  method: 'put',
  path: '/admin/plugins/{slug}/reject',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: {
    params: SlugParamSchema,
    body: { content: { 'application/json': { schema: RejectBodySchema } } },
  },
  responses: {
    200: successResponse(AdminPluginSchema, 'Plugin rejected'),
    404: errorResponse('Plugin not found'),
  },
})

const toggleFeaturedRoute = createRoute({
  method: 'put',
  path: '/admin/plugins/{slug}/feature',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { params: SlugParamSchema },
  responses: {
    200: successResponse(AdminPluginSchema, 'Featured toggled'),
    404: errorResponse('Plugin not found'),
  },
})

const removePluginRoute = createRoute({
  method: 'delete',
  path: '/admin/plugins/{slug}',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { params: SlugParamSchema },
  responses: {
    200: successResponse(PluginIdResponseSchema, 'Plugin removed'),
    404: errorResponse('Plugin not found'),
  },
})

const bulkApproveRoute = createRoute({
  method: 'post',
  path: '/admin/plugins/bulk-approve',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { body: { content: { 'application/json': { schema: BulkSlugsBodySchema } } } },
  responses: {
    200: successResponse(AdminBulkResultSchema, 'Bulk approved'),
  },
})

const bulkRejectRoute = createRoute({
  method: 'post',
  path: '/admin/plugins/bulk-reject',
  tags: ['admin-plugins'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { body: { content: { 'application/json': { schema: BulkRejectBodySchema } } } },
  responses: {
    200: successResponse(AdminBulkRejectResultSchema, 'Bulk rejected'),
  },
})

const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/admin/categories',
  tags: ['admin-categories'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  responses: {
    200: successResponse(CategoryListResponseSchema, 'List categories'),
  },
})

const createCategoryRoute = createRoute({
  method: 'post',
  path: '/admin/categories',
  tags: ['admin-categories'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { body: { content: { 'application/json': { schema: CreateCategoryBodySchema } } } },
  responses: {
    201: successResponse(CategorySchema, 'Category created'),
  },
})

const updateCategoryRoute = createRoute({
  method: 'put',
  path: '/admin/categories/{id}',
  tags: ['admin-categories'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: UpdateCategoryBodySchema } } },
  },
  responses: {
    200: successResponse(CategorySchema, 'Category updated'),
    404: errorResponse('Category not found'),
  },
})

const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/admin/categories/{id}',
  tags: ['admin-categories'],
  security: [{ Bearer: [] }],
  middleware: [adminAuth],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(PluginIdResponseSchema, 'Category deleted'),
    404: errorResponse('Category not found'),
  },
})

export const pluginAdminRoutes = new OpenAPIHono()
  .openapi(getDashboardRoute, async c => {
    const stats = await adminService.getDashboardStats()
    return c.json(success(stats), 200)
  })
  .openapi(getInventoryRoute, async c => {
    const inventory = await adminService.getPluginInventory()
    return c.json(success(inventory), 200)
  })
  .openapi(getPendingRoute, async c => {
    const query = c.req.valid('query')
    const result = await adminService.listPendingPlugins({
      status: query.status,
      page: parsePositiveInt(query.page, 1),
      limit: parsePositiveInt(query.limit, 20),
    })
    return c.json(success(result), 200)
  })
  .openapi(listAllPluginsRoute, async c => {
    const query = c.req.valid('query')
    const result = await adminService.adminListAllPlugins({
      page: parsePositiveInt(query.page, 1),
      limit: parsePositiveInt(query.limit, 20),
      search: query.search,
      status: query.status,
    })
    return c.json(success(result), 200)
  })
  .openapi(approveRoute, async c => {
    const { slug } = c.req.valid('param')
    const user = c.get('authUser')
    const plugin = await adminService.approvePlugin(slug, user.id)
    return c.json(success(plugin), 200)
  })
  .openapi(rejectRoute, async c => {
    const { slug } = c.req.valid('param')
    const { reason } = c.req.valid('json')
    const user = c.get('authUser')
    const plugin = await adminService.rejectPlugin(slug, reason, user.id)
    return c.json(success(plugin), 200)
  })
  .openapi(toggleFeaturedRoute, async c => {
    const { slug } = c.req.valid('param')
    const plugin = await adminService.toggleFeatured(slug)
    return c.json(success(plugin), 200)
  })
  .openapi(removePluginRoute, async c => {
    const { slug } = c.req.valid('param')
    const result = await adminService.adminRemovePlugin(slug)
    return c.json(success(result), 200)
  })
  .openapi(bulkApproveRoute, async c => {
    const { slugs } = c.req.valid('json')
    const user = c.get('authUser')
    let approved = 0
    for (const slug of slugs) {
      try {
        await adminService.approvePlugin(slug, user.id)
        approved++
      } catch {
        // skip failures
      }
    }
    return c.json(success({ approved }), 200)
  })
  .openapi(bulkRejectRoute, async c => {
    const { slugs, reason } = c.req.valid('json')
    const user = c.get('authUser')
    let rejected = 0
    for (const slug of slugs) {
      try {
        await adminService.rejectPlugin(slug, reason ?? 'Bulk rejection', user.id)
        rejected++
      } catch {
        // skip failures
      }
    }
    return c.json(success({ rejected }), 200)
  })
  .openapi(listCategoriesRoute, async c => {
    const categories = await adminService.listCategoriesAdmin()
    return c.json(success(categories), 200)
  })
  .openapi(createCategoryRoute, async c => {
    const data = c.req.valid('json')
    const category = await adminService.createCategory(data)
    return c.json(success(category), 201)
  })
  .openapi(updateCategoryRoute, async c => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    const category = await adminService.updateCategory(id, data)
    return c.json(success(category), 200)
  })
  .openapi(deleteCategoryRoute, async c => {
    const { id } = c.req.valid('param')
    const result = await adminService.deleteCategory(id)
    return c.json(success(result), 200)
  })
  .openapi(dbCleanupRoute, async c => {
    const seedSlugs = ['baidu', 'douyin', 'github-seo', 'web-automation']
    const countResult = await adminService.resetSeedPluginCounts(seedSlugs)
    const reviewResult = await adminService.cleanupTestReviews()
    return c.json(
      success({
        countsReset: countResult,
        reviewsCleaned: reviewResult,
      }),
      200
    )
  })
  .openapi(listDevelopersRoute, async c => {
    const devs = await adminService.listAllDevelopers()
    return c.json(success(devs), 200)
  })
  .openapi(promoteDeveloperRoute, async c => {
    const body = c.req.valid('json')
    const result = await adminService.promoteToAdmin(body.email, body.username)
    return c.json(success(result), 200)
  })
