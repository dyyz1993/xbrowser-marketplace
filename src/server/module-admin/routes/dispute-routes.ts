/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import {
  DisputeRowSchema,
  DisputeListSchema,
  CountResultSchema,
  SeedBodySchema,
  ResolveDisputeSchema,
  RejectDisputeSchema,
  DisputeListQuerySchema,
  IdParamSchema,
} from '@shared/modules/admin/schemas'
import * as service from '../services/dispute-service'

const listRoute = createRoute({
  method: 'get',
  path: '/admin/disputes',
  tags: ['admin-disputes'],
  request: { query: DisputeListQuerySchema },
  responses: { 200: successResponse(DisputeListSchema, 'List disputes') },
})

const getByIdRoute = createRoute({
  method: 'get',
  path: '/admin/disputes/{id}',
  tags: ['admin-disputes'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(DisputeRowSchema, 'Get dispute'),
    404: errorResponse('Dispute not found'),
  },
})

const investigateRoute = createRoute({
  method: 'put',
  path: '/admin/disputes/{id}/investigate',
  tags: ['admin-disputes'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(DisputeRowSchema, 'Investigate dispute'),
    404: errorResponse('Dispute not found'),
  },
})

const resolveRoute = createRoute({
  method: 'put',
  path: '/admin/disputes/{id}/resolve',
  tags: ['admin-disputes'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: ResolveDisputeSchema } } },
  },
  responses: {
    200: successResponse(DisputeRowSchema, 'Resolve dispute'),
    404: errorResponse('Dispute not found'),
  },
})

const rejectRoute = createRoute({
  method: 'put',
  path: '/admin/disputes/{id}/reject',
  tags: ['admin-disputes'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: RejectDisputeSchema } } },
  },
  responses: {
    200: successResponse(DisputeRowSchema, 'Reject dispute'),
    404: errorResponse('Dispute not found'),
  },
})

const seedRoute = createRoute({
  method: 'post',
  path: '/admin/disputes/seed',
  tags: ['admin-disputes'],
  request: { body: { content: { 'application/json': { schema: SeedBodySchema } } } },
  responses: { 200: successResponse(CountResultSchema, 'Seed disputes') },
})

export const disputeRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c: any) => {
    const query = c.req.valid('query')
    const result = await service.getDisputes({
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      status: query.status ?? undefined,
      type: query.type ?? undefined,
    })
    return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() })
  })
  .openapi(getByIdRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const dispute = await service.getDisputeById(parseInt(id))
    if (!dispute) return c.json({ success: false as const, error: 'Dispute not found' }, 404)
    return c.json({ success: true as const, data: dispute, timestamp: new Date().toISOString() })
  })
  .openapi(investigateRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const dispute = await service.investigateDispute(parseInt(id))
    if (!dispute)
      return c.json(
        { success: false as const, error: 'Dispute not found or cannot investigate' },
        404
      )
    return c.json({ success: true as const, data: dispute, timestamp: new Date().toISOString() })
  })
  .openapi(resolveRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const dispute = await service.resolveDispute(parseInt(id), body.resolution, body.resolvedBy)
    if (!dispute)
      return c.json({ success: false as const, error: 'Dispute not found or cannot resolve' }, 404)
    return c.json({ success: true as const, data: dispute, timestamp: new Date().toISOString() })
  })
  .openapi(rejectRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const dispute = await service.rejectDispute(parseInt(id), body.reason, body.rejectedBy)
    if (!dispute)
      return c.json({ success: false as const, error: 'Dispute not found or cannot reject' }, 404)
    return c.json({ success: true as const, data: dispute, timestamp: new Date().toISOString() })
  })
  .openapi(seedRoute, async (c: any) => {
    const body = c.req.valid('json')
    const count = body?.count ?? 15
    await service.seedDisputes(count)
    return c.json({ success: true as const, data: { count }, timestamp: new Date().toISOString() })
  })
