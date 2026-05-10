import { getDb } from '@server/db'
import { tickets, ticketMessages } from '@server/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { generateTicketNo } from '@server/utils/generate'

export async function getTickets(filters?: {
  status?: string
  priority?: string
  category?: string
  page?: number
  limit?: number
}): Promise<{ items: (typeof tickets.$inferSelect)[]; total: number }> {
  const db = await getDb()
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = []
  if (filters?.status) conditions.push(eq(tickets.status, filters.status))
  if (filters?.priority) conditions.push(eq(tickets.priority, filters.priority))
  if (filters?.category) conditions.push(eq(tickets.category, filters.category))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(tickets)
      .where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(where),
  ])

  return { items, total: countResult[0]?.count ?? 0 }
}

export async function getTicketById(id: number) {
  const db = await getDb()
  const ticketRows = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (ticketRows.length === 0) return null
  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(ticketMessages.createdAt)
  return { ...ticketRows[0], messages }
}

export async function replyTicket(id: number, content: string, author: string, isAdmin: boolean) {
  const db = await getDb()
  const ticket = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (ticket.length === 0) return null
  const now = new Date()
  await db.insert(ticketMessages).values({
    ticketId: id,
    userId: isAdmin ? 'admin' : ticket[0].userId,
    author,
    content,
    isAdmin,
    createdAt: now,
  })
  const newStatus = ticket[0].status === 'open' ? 'in_progress' : ticket[0].status
  await db.update(tickets).set({ status: newStatus, updatedAt: now }).where(eq(tickets.id, id))
  return getTicketById(id)
}

export async function closeTicket(id: number) {
  const db = await getDb()
  const ticket = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (ticket.length === 0) return null
  const now = new Date()
  await db.update(tickets).set({ status: 'closed', updatedAt: now }).where(eq(tickets.id, id))
  return getTicketById(id)
}

export async function assignTicket(id: number, assignedTo: string) {
  const db = await getDb()
  const ticket = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1)
  if (ticket.length === 0) return null
  const now = new Date()
  await db.update(tickets).set({ assignedTo, updatedAt: now }).where(eq(tickets.id, id))
  return getTicketById(id)
}

export async function seedTickets(count: number = 20) {
  const db = await getDb()
  const customers = [
    { name: '张三', email: 'zhangsan@example.com' },
    { name: '李四', email: 'lisi@example.com' },
    { name: '王五', email: 'wangwu@example.com' },
    { name: '赵六', email: 'zhaoliu@example.com' },
    { name: '钱七', email: 'qianqi@example.com' },
  ]
  const subjects = [
    '无法登录系统',
    '订单支付失败',
    '功能使用咨询',
    '数据导出问题',
    '账号权限申请',
    '系统性能问题',
    '界面显示异常',
    'API 调用错误',
  ]
  const priorities = ['low', 'medium', 'high', 'urgent'] as const
  const categories = ['technical', 'billing', 'feature_request', 'bug_report', 'general'] as const
  const statuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'] as const
  const agents = ['客服小王', '客服小李', '客服小张']

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const category = categories[Math.floor(Math.random() * categories.length)]
    const subject = subjects[Math.floor(Math.random() * subjects.length)]
    const assignedTo = status !== 'open' ? agents[Math.floor(Math.random() * agents.length)] : null

    const result = await db
      .insert(tickets)
      .values({
        ticketNo: generateTicketNo(),
        userId: `user-${i + 1}`,
        customerName: customer.name,
        customerEmail: customer.email,
        subject,
        description: `关于${subject}的详细描述，用户遇到了一些问题需要解决。`,
        status,
        priority,
        category,
        assignedTo,
      })
      .returning({ id: tickets.id })

    if (status !== 'open' && result[0]) {
      const replyCount = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < replyCount; j++) {
        const isAdminReply = j % 2 === 0
        await db.insert(ticketMessages).values({
          ticketId: result[0].id,
          userId: isAdminReply ? 'admin' : `user-${i + 1}`,
          author: isAdminReply ? agents[Math.floor(Math.random() * agents.length)] : customer.name,
          content: `这是第 ${j + 1} 条回复内容，解决了用户的问题。`,
          isAdmin: isAdminReply,
        })
      }
    }
  }
}
