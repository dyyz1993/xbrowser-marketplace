import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthUser } from '../../middleware/auth'
import * as adminService from '../services/admin-service'
import { successResponse, errorResponse, success } from '../../utils/route-helpers'
import { SystemStatsSchema, HealthCheckSchema, RecentActivitySchema } from '@shared/modules/admin'

const getStatsRoute = createRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  responses: {
    200: successResponse(SystemStatsSchema, 'Get system statistics'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getHealthRoute = createRoute({
  method: 'get',
  path: '/admin/health',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  responses: {
    200: successResponse(HealthCheckSchema, 'Get system health'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getRecentActivityRoute = createRoute({
  method: 'get',
  path: '/admin/activity',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      limit: z.string().optional(),
    }),
  },
  responses: {
    200: successResponse(RecentActivitySchema, 'Get recent activity'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

export const systemRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getStatsRoute, async c => {
    const stats = await adminService.getSystemStats()
    return c.json(success(stats), 200)
  })
  .openapi(getHealthRoute, async c => {
    const health = await adminService.checkDatabaseHealth()
    return c.json(success(health), 200)
  })
  .openapi(getRecentActivityRoute, async c => {
    const activity: { id: number; title: string; status: string; updatedAt: string }[] = []
    return c.json(success(activity), 200)
  })
