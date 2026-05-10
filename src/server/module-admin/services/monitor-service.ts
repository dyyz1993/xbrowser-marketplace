import { getDb } from '../../db'
import { plugins, developers, orders, tickets, disputes, contents } from '../../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

const startTime = Date.now()

export async function getMonitorStats() {
  const db = await getDb()

  const [
    userResult,
    pluginResult,
    orderResult,
    ticketResult,
    disputeResult,
    contentResult,
    pendingPluginResult,
    openTicketResult,
    pendingOrderResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(developers),
    db.select({ count: sql<number>`count(*)` }).from(plugins),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db.select({ count: sql<number>`count(*)` }).from(tickets),
    db.select({ count: sql<number>`count(*)` }).from(disputes),
    db.select({ count: sql<number>`count(*)` }).from(contents),
    db
      .select({ count: sql<number>`count(*)` })
      .from(plugins)
      .where(eq(plugins.status, 'pending')),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.status, 'open')),
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'pending')),
  ])

  return {
    totalUsers: Number(userResult[0]?.count ?? 0),
    totalPlugins: Number(pluginResult[0]?.count ?? 0),
    totalOrders: Number(orderResult[0]?.count ?? 0),
    totalTickets: Number(ticketResult[0]?.count ?? 0),
    totalDisputes: Number(disputeResult[0]?.count ?? 0),
    totalContents: Number(contentResult[0]?.count ?? 0),
    pendingPlugins: Number(pendingPluginResult[0]?.count ?? 0),
    openTickets: Number(openTicketResult[0]?.count ?? 0),
    pendingOrders: Number(pendingOrderResult[0]?.count ?? 0),
  }
}

function toISO(val: unknown): string {
  if (val instanceof Date) return val.toISOString()
  const n = Number(val)
  return new Date(n > 1e12 ? n : n * 1000).toISOString()
}

export async function getRecentActivity(limit = 10) {
  const db = await getDb()

  const [recentPlugins, recentOrders, recentTickets] = await Promise.all([
    db
      .select({
        id: plugins.id,
        name: plugins.name,
        status: plugins.status,
        createdAt: plugins.createdAt,
      })
      .from(plugins)
      .orderBy(desc(plugins.createdAt))
      .limit(5),
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5),
    db
      .select({
        id: tickets.id,
        ticketNo: tickets.ticketNo,
        status: tickets.status,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .orderBy(desc(tickets.createdAt))
      .limit(5),
  ])

  const activity = [
    ...recentPlugins.map(p => ({
      id: p.id,
      type: 'plugin' as const,
      title: p.name,
      status: p.status ?? 'unknown',
      createdAt: toISO(p.createdAt),
    })),
    ...recentOrders.map(o => ({
      id: o.id,
      type: 'order' as const,
      title: `Order ${o.orderNo}`,
      status: o.status ?? 'unknown',
      createdAt: toISO(o.createdAt),
    })),
    ...recentTickets.map(t => ({
      id: t.id,
      type: 'ticket' as const,
      title: `Ticket ${t.ticketNo}`,
      status: t.status ?? 'unknown',
      createdAt: toISO(t.createdAt),
    })),
  ]

  return activity
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

export async function getHealthStatus() {
  try {
    const db = await getDb()
    await db
      .select({ count: sql<number>`count(*)` })
      .from(plugins)
      .limit(1)
    return {
      database: 'connected' as const,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }
  } catch {
    return {
      database: 'disconnected' as const,
      uptime: Math.floor((Date.now() - startTime) / 1000),
    }
  }
}
