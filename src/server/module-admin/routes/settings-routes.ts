import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware, type AuthUser } from '../../middleware/auth'
import { successResponse, errorResponse, success } from '../../utils/route-helpers'
import { Role } from '@shared/modules/permission'
import * as settingsService from '../services/settings-service'

const SettingItemSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
  updatedAt: z.string(),
})

const SettingListSchema = z.array(SettingItemSchema)

const UpdateSettingItemSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
})

const BatchUpdateSettingsSchema = z.object({
  items: z.array(UpdateSettingItemSchema),
})

const SingleSettingUpdateSchema = z.object({
  value: z.string(),
  description: z.string().optional(),
})

const getSettingsRoute = createRoute({
  method: 'get',
  path: '/admin/settings',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  responses: {
    200: successResponse(SettingListSchema, 'Get all settings'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const getSettingByKeyRoute = createRoute({
  method: 'get',
  path: '/admin/settings/:key',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    params: z.object({ key: z.string() }),
  },
  responses: {
    200: successResponse(SettingItemSchema, 'Get setting by key'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
    404: errorResponse('Setting not found'),
  },
})

const batchUpdateSettingsRoute = createRoute({
  method: 'put',
  path: '/admin/settings',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    body: {
      content: { 'application/json': { schema: BatchUpdateSettingsSchema } },
    },
  },
  responses: {
    200: successResponse(SettingListSchema, 'Batch update settings'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

const updateSettingByKeyRoute = createRoute({
  method: 'put',
  path: '/admin/settings/:key',
  tags: ['admin'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware({ requiredRole: Role.SUPER_ADMIN })],
  request: {
    params: z.object({ key: z.string() }),
    body: {
      content: { 'application/json': { schema: SingleSettingUpdateSchema } },
    },
  },
  responses: {
    200: successResponse(SettingItemSchema, 'Update setting'),
    401: errorResponse('Unauthorized'),
    403: errorResponse('Forbidden'),
  },
})

export const settingsRoutes = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .openapi(getSettingsRoute, async c => {
    const items = await settingsService.getAllSettings()
    return c.json(success(items), 200)
  })
  .openapi(getSettingByKeyRoute, async c => {
    const { key } = c.req.valid('param')
    const item = await settingsService.getSettingByKey(key)
    if (!item) {
      return c.json({ success: false as const, error: 'Setting not found' }, 404)
    }
    return c.json(success(item), 200)
  })
  .openapi(batchUpdateSettingsRoute, async c => {
    const { items } = c.req.valid('json')
    const result = await settingsService.batchUpsertSettings(items)
    return c.json(success(result), 200)
  })
  .openapi(updateSettingByKeyRoute, async c => {
    const { key } = c.req.valid('param')
    const body = c.req.valid('json')
    const result = await settingsService.upsertSetting(key, body.value, body.description)
    return c.json(success(result), 200)
  })
