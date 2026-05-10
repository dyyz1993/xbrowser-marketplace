import { getDb } from '../../db'
import { plugins, developers, orders, tickets, disputes, contents } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

const startTime = Date.now()

export async function getMonitorStats() {
  const db = await getDb()

  const [
    allUsers,
    allPlugins,
    allOrders,
    allTickets,
    allDisputes,
    allContents,
    pendingPlugins,
    openTickets,
    pendingOrders,
  ] = await Promise.all([
    db.select().from(developers),
    db.select().from(plugins),
    db.select().from(orders),
    db.select().from(tickets),
    db.select().from(disputes),
    db.select().from(contents),
    db.select().from(plugins).where(eq(plugins.status, 'pending')),
    db.select().from(tickets).where(eq(tickets.status, 'open')),
    db.select().from(orders).where(eq(orders.status, 'pending')),
  ])

  return {
    totalUsers: allUsers.length,
    totalPlugins: allPlugins.length,
    totalOrders: allOrders.length,
    totalTickets: allTickets.length,
    totalDisputes: allDisputes.length,
    totalContents: allContents.length,
    pendingPlugins: pendingPlugins.length,
    openTickets: openTickets.length,
    pendingOrders: pendingOrders.length,
  }
}

// eslint-disable-next-line local-rules/no-util-functions-in-service
function toISO(val: unknown): string {
  if (val instanceof Date) return val.toISOString()
  const n = Number(val)
  return new Date(n > 1e12 ? n : n * 1000).toISOString()
}

export async function getRecentActivity(limit = 10) {
  const db = await getDb()

  const [recentPlugins, recentOrders, recentTickets] = await Promise.all([
    db.select().from(plugins).orderBy(desc(plugins.createdAt)).limit(5),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),
    db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(5),
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
    await db.select().from(plugins).limit(1)
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
