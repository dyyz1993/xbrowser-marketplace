import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import {
  OrderRowSchema,
  OrderListSchema,
  CountResultSchema,
  SeedBodySchema,
  OrderListQuerySchema,
  IdParamSchema,
} from '@shared/modules/admin/schemas'
import * as service from '../services/order-service'

const listRoute = createRoute({
  method: 'get',
  path: '/admin/orders',
  tags: ['admin-orders'],
  request: { query: OrderListQuerySchema },
  responses: { 200: successResponse(OrderListSchema, 'List orders') },
})

const getByIdRoute = createRoute({
  method: 'get',
  path: '/admin/orders/{id}',
  tags: ['admin-orders'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(OrderRowSchema, 'Get order'),
    404: errorResponse('Order not found'),
  },
})

const processRoute = createRoute({
  method: 'put',
  path: '/admin/orders/{id}/process',
  tags: ['admin-orders'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(OrderRowSchema, 'Process order'),
    404: errorResponse('Order not found'),
  },
})

const cancelRoute = createRoute({
  method: 'put',
  path: '/admin/orders/{id}/cancel',
  tags: ['admin-orders'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(OrderRowSchema, 'Cancel order'),
    404: errorResponse('Order not found'),
  },
})

const completeRoute = createRoute({
  method: 'put',
  path: '/admin/orders/{id}/complete',
  tags: ['admin-orders'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(OrderRowSchema, 'Complete order'),
    404: errorResponse('Order not found'),
  },
})

const seedRoute = createRoute({
  method: 'post',
  path: '/admin/orders/seed',
  tags: ['admin-orders'],
  request: { body: { content: { 'application/json': { schema: SeedBodySchema } } } },
  responses: { 200: successResponse(CountResultSchema, 'Seed orders') },
})

export const orderRoutes = new OpenAPIHono()
  .openapi(listRoute, async c => {
    const query = c.req.valid('query')
    const result = await service.getOrders({
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      status: query.status,
      customerName: query.search,
    })
    return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() })
  })
  .openapi(getByIdRoute, async c => {
    const { id } = c.req.valid('param')
    const order = await service.getOrderById(parseInt(id))
    if (!order) return c.json({ success: false as const, error: 'Order not found' }, 404)
    return c.json({ success: true as const, data: order, timestamp: new Date().toISOString() })
  })
  .openapi(processRoute, async c => {
    const { id } = c.req.valid('param')
    const order = await service.processOrder(parseInt(id))
    if (!order)
      return c.json({ success: false as const, error: 'Order not found or cannot process' }, 404)
    return c.json({ success: true as const, data: order, timestamp: new Date().toISOString() })
  })
  .openapi(cancelRoute, async c => {
    const { id } = c.req.valid('param')
    const order = await service.cancelOrder(parseInt(id))
    if (!order)
      return c.json({ success: false as const, error: 'Order not found or cannot cancel' }, 404)
    return c.json({ success: true as const, data: order, timestamp: new Date().toISOString() })
  })
  .openapi(completeRoute, async c => {
    const { id } = c.req.valid('param')
    const order = await service.completeOrder(parseInt(id))
    if (!order)
      return c.json({ success: false as const, error: 'Order not found or cannot complete' }, 404)
    return c.json({ success: true as const, data: order, timestamp: new Date().toISOString() })
  })
  .openapi(seedRoute, async c => {
    const body = c.req.valid('json')
    const count = body?.count ?? 25
    await service.seedOrders(count)
    return c.json({ success: true as const, data: { count }, timestamp: new Date().toISOString() })
  })
