/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRoute } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { successResponse, errorResponse } from '@server/utils/route-helpers'
import {
  TicketDetailSchema,
  TicketListSchema,
  CountResultSchema,
  SeedBodySchema,
  ReplyTicketSchema,
  AssignTicketSchema,
  TicketListQuerySchema,
  IdParamSchema,
} from '@shared/modules/admin/schemas'
import * as service from '../services/ticket-service'

const listRoute = createRoute({
  method: 'get',
  path: '/admin/tickets',
  tags: ['admin-tickets'],
  request: { query: TicketListQuerySchema },
  responses: { 200: successResponse(TicketListSchema, 'List tickets') },
})

const getByIdRoute = createRoute({
  method: 'get',
  path: '/admin/tickets/{id}',
  tags: ['admin-tickets'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(TicketDetailSchema, 'Get ticket'),
    404: errorResponse('Ticket not found'),
  },
})

const replyRoute = createRoute({
  method: 'post',
  path: '/admin/tickets/{id}/reply',
  tags: ['admin-tickets'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: ReplyTicketSchema } } },
  },
  responses: {
    200: successResponse(TicketDetailSchema, 'Reply ticket'),
    404: errorResponse('Ticket not found'),
  },
})

const closeRoute = createRoute({
  method: 'put',
  path: '/admin/tickets/{id}/close',
  tags: ['admin-tickets'],
  request: { params: IdParamSchema },
  responses: {
    200: successResponse(TicketDetailSchema, 'Close ticket'),
    404: errorResponse('Ticket not found'),
  },
})

const assignRoute = createRoute({
  method: 'put',
  path: '/admin/tickets/{id}/assign',
  tags: ['admin-tickets'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: AssignTicketSchema } } },
  },
  responses: {
    200: successResponse(TicketDetailSchema, 'Assign ticket'),
    404: errorResponse('Ticket not found'),
  },
})

const seedRoute = createRoute({
  method: 'post',
  path: '/admin/tickets/seed',
  tags: ['admin-tickets'],
  request: { body: { content: { 'application/json': { schema: SeedBodySchema } } } },
  responses: { 200: successResponse(CountResultSchema, 'Seed tickets') },
})

export const ticketRoutes = new OpenAPIHono()
  .openapi(listRoute, async (c: any) => {
    const query = c.req.valid('query')
    const result = await service.getTickets({
      page: parseInt(query.page),
      limit: parseInt(query.limit),
      status: query.status,
      priority: query.priority,
      category: query.category,
    })
    return c.json({ success: true as const, data: result, timestamp: new Date().toISOString() })
  })
  .openapi(getByIdRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const ticket = await service.getTicketById(parseInt(id))
    if (!ticket) return c.json({ success: false as const, error: 'Ticket not found' }, 404)
    return c.json({ success: true as const, data: ticket, timestamp: new Date().toISOString() })
  })
  .openapi(replyRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const ticket = await service.replyTicket(parseInt(id), body.content, body.author, true)
    if (!ticket) return c.json({ success: false as const, error: 'Ticket not found' }, 404)
    return c.json({ success: true as const, data: ticket, timestamp: new Date().toISOString() })
  })
  .openapi(closeRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const ticket = await service.closeTicket(parseInt(id))
    if (!ticket) return c.json({ success: false as const, error: 'Ticket not found' }, 404)
    return c.json({ success: true as const, data: ticket, timestamp: new Date().toISOString() })
  })
  .openapi(assignRoute, async (c: any) => {
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const ticket = await service.assignTicket(parseInt(id), body.assignedTo)
    if (!ticket) return c.json({ success: false as const, error: 'Ticket not found' }, 404)
    return c.json({ success: true as const, data: ticket, timestamp: new Date().toISOString() })
  })
  .openapi(seedRoute, async (c: any) => {
    const body = c.req.valid('json')
    const count = body?.count ?? 20
    await service.seedTickets(count)
    return c.json({ success: true as const, data: { count }, timestamp: new Date().toISOString() })
  })
