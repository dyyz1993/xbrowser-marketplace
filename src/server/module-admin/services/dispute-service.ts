import { getDb } from '@server/db'
import { disputes } from '@server/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { generateDisputeNo } from '@server/utils/generate'

export async function getDisputes(filters?: {
  status?: string
  type?: string
  page?: number
  limit?: number
}): Promise<{ items: (typeof disputes.$inferSelect)[]; total: number }> {
  const db = await getDb()
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = []
  if (filters?.status) conditions.push(eq(disputes.status, filters.status))
  if (filters?.type) conditions.push(eq(disputes.type, filters.type))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(disputes)
      .where(where)
      .orderBy(desc(disputes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(disputes)
      .where(where),
  ])

  return { items, total: countResult[0]?.count ?? 0 }
}

export async function getDisputeById(id: number) {
  const db = await getDb()
  const result = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1)
  return result[0] ?? null
}

export async function investigateDispute(id: number) {
  const db = await getDb()
  const existing = await getDisputeById(id)
  if (!existing || existing.status !== 'pending') return null
  const now = new Date()
  await db
    .update(disputes)
    .set({ status: 'investigating', updatedAt: now })
    .where(eq(disputes.id, id))
  return { ...existing, status: 'investigating' as const, updatedAt: now }
}

export async function resolveDispute(id: number, resolution: string, resolvedBy: string) {
  const db = await getDb()
  const existing = await getDisputeById(id)
  if (!existing || (existing.status !== 'pending' && existing.status !== 'investigating'))
    return null
  const now = new Date()
  await db
    .update(disputes)
    .set({ status: 'resolved', resolution, resolvedBy, resolvedAt: now, updatedAt: now })
    .where(eq(disputes.id, id))
  return {
    ...existing,
    status: 'resolved' as const,
    resolution,
    resolvedBy,
    resolvedAt: now,
    updatedAt: now,
  }
}

export async function rejectDispute(id: number, reason: string, rejectedBy: string) {
  const db = await getDb()
  const existing = await getDisputeById(id)
  if (!existing || (existing.status !== 'pending' && existing.status !== 'investigating'))
    return null
  const now = new Date()
  await db
    .update(disputes)
    .set({
      status: 'rejected',
      resolution: reason,
      resolvedBy: rejectedBy,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(disputes.id, id))
  return {
    ...existing,
    status: 'rejected' as const,
    resolution: reason,
    resolvedBy: rejectedBy,
    resolvedAt: now,
    updatedAt: now,
  }
}

export async function seedDisputes(count: number = 15) {
  const db = await getDb()
  const customerNames = ['张三', '李四', '王五', '赵六', '钱七']
  const types = ['refund', 'product_quality', 'service_quality', 'delivery', 'other'] as const
  const statuses = ['pending', 'investigating', 'resolved', 'rejected'] as const
  const descriptions = [
    '商品与描述不符，要求退款',
    '商品质量问题，要求换货',
    '服务态度差，要求赔偿',
    '配送延迟，要求补偿',
    '订单金额错误，要求更正',
  ]
  const resolutions = [
    '已同意退款，3-5个工作日内到账',
    '已安排换货，预计3天内送达',
    '已发放优惠券作为补偿',
    '已部分退款，问题已解决',
  ]

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const isResolved = status === 'resolved' || status === 'rejected'

    await db.insert(disputes).values({
      disputeNo: generateDisputeNo(),
      orderId: i + 1,
      userId: `user-${(i % 5) + 1}`,
      customerName: customerNames[i % 5],
      customerEmail: `${['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi'][i % 5]}@example.com`,
      type,
      status,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      resolution: isResolved ? resolutions[Math.floor(Math.random() * resolutions.length)] : null,
      amount: Math.floor(Math.random() * 5000) + 100,
      resolvedAt: isResolved ? new Date() : null,
      resolvedBy: isResolved ? '客服小王' : null,
    })
  }
}
