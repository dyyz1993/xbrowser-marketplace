import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import {
  ContentRowSchema,
  ContentListSchema,
  CreateContentSchema,
  UpdateContentSchema,
  DeletedResultSchema,
  ContentListQuerySchema,
  IdParamSchema,
} from '@shared/modules/admin/schemas'
import * as service from '../services/content-service'

const listRoute = createRoute({
  method: 'get',
  path: '/admin/contents',
  tags: ['admin-contents'],
  request: { query: ContentListQuerySchema },
  responses: { 200: successResponse(ContentListSchema, 'List contents') },
})

const getByIdRoute = createRoute({
  method: 'get',
  path: '/admin/contents/{id}',
  tags: ['admin-contents'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(ContentRowSchema, 'Get content'),
    404: errorResponse('Content not found'),
  },
})

const createRoute_ = createRoute({
  method: 'post',
  path: '/admin/contents',
  tags: ['admin-contents'],
  request: { body: { content: { 'application/json': { schema: CreateContentSchema } } } },
  responses: { 201: successResponse(ContentRowSchema, 'Create content') },
})

const updateRoute = createRoute({
  method: 'put',
  path: '/admin/contents/{id}',
  tags: ['admin-contents'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: UpdateContentSchema } } },
  },
  responses: {
    200: successResponse(ContentRowSchema, 'Update content'),
    404: errorResponse('Content not found'),
  },
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/admin/contents/{id}',
  tags: ['admin-contents'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(DeletedResultSchema, 'Delete content'),
    404: errorResponse('Content not found'),
  },
})

const publishRoute = createRoute({
  method: 'put',
  path: '/admin/contents/{id}/publish',
  tags: ['admin-contents'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(ContentRowSchema, 'Publish content'),
    404: errorResponse('Content not found'),
  },
})

const archiveRoute = createRoute({
  method: 'put',
  path: '/admin/contents/{id}/archive',
  tags: ['admin-contents'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(ContentRowSchema, 'Archive content'),
    404: errorResponse('Content not found'),
  },
})

export const contentRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')
    const result = await service.getContents({
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      category: query.category,
      status: query.status,
      search: query.search,
    })
    return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() })
  })
  .openapi(getByIdRoute, async c => {
    const { id } = c.req.valid('param')
    const content = await service.getContentById(parseInt(id))
    if (!content) return c.json({ success: false as const, error: 'Content not found' }, 404)
    return c.json({ success: true as const, data: content, timestamp: new Date().toISOString() })
  })
  .openapi(createRoute_, async c => {
    const body = c.req.valid('json')
    const content = await service.createContent(body)
    return c.json(
      { success: true as const, data: content, timestamp: new Date().toISOString() },
      201
    )
  })
  .openapi(updateRoute, async c => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const content = await service.updateContent(parseInt(id), body)
    if (!content) return c.json({ success: false as const, error: 'Content not found' }, 404)
    return c.json({ success: true as const, data: content, timestamp: new Date().toISOString() })
  })
  .openapi(deleteRoute, async c => {
    const { id } = c.req.valid('param')
    const deleted = await service.deleteContent(parseInt(id))
    if (!deleted) return c.json({ success: false as const, error: 'Content not found' }, 404)
    return c.json({
      success: true as const,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    })
  })
  .openapi(publishRoute, async c => {
    const { id } = c.req.valid('param')
    const content = await service.publishContent(parseInt(id))
    if (!content)
      return c.json({ success: false as const, error: 'Content not found or cannot publish' }, 404)
    return c.json({ success: true as const, data: content, timestamp: new Date().toISOString() })
  })
  .openapi(archiveRoute, async c => {
    const { id } = c.req.valid('param')
    const content = await service.archiveContent(parseInt(id))
    if (!content)
      return c.json({ success: false as const, error: 'Content not found or cannot archive' }, 404)
    return c.json({ success: true as const, data: content, timestamp: new Date().toISOString() })
  })
