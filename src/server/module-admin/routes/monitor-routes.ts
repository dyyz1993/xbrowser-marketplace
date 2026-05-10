import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthUser } from '../../middleware/auth'
import { successResponse, errorResponse, success } from '../../utils/route-helpers'
import { MonitorDataSchema } from '@shared/modules/admin'
import * as monitorService from '../services/monitor-service'

const getMonitorRoute = createRoute({
  method: 'get',
  path: '/admin/monitor',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  responses: {
    200: successResponse(MonitorDataSchema, 'Get monitor data'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

export const monitorRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>().openapi(
  getMonitorRoute,
  async c => {
    const [stats, recentActivity, health] = await Promise.all([
      monitorService.getMonitorStats(),
      monitorService.getRecentActivity(),
      monitorService.getHealthStatus(),
    ])
    return c.json(success({ stats, recentActivity, health }), 200)
  }
)
