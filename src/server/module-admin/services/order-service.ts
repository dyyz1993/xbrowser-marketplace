import { getDb } from '@server/db'
import { orders } from '@server/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import { generateOrderNo } from '@server/utils/generate'

export async function getOrders(filters?: {
  status?: string
  customerName?: string
  page?: number
  limit?: number
}): Promise<{ items: (typeof orders.$inferSelect)[]; total: number }> {
  const db = await getDb()
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = []
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as (typeof orders.$inferSelect)['status']))
  }
  if (filters?.customerName) {
    conditions.push(
      sql`(${orders.customerName} LIKE ${'%' + filters.customerName + '%'} OR ${orders.customerEmail} LIKE ${'%' + filters.customerName + '%'})`
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const allItems = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt))

  const total = allItems.length
  const items = allItems.slice(offset, offset + limit)

  return { items, total }
}

export async function getOrderById(id: number) {
  const db = await getDb()
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  return result[0] ?? null
}

export async function processOrder(id: number) {
  const db = await getDb()
  const existing = await getOrderById(id)
  if (!existing || existing.status !== 'pending') return null
  const now = new Date()
  await db.update(orders).set({ status: 'processing', updatedAt: now }).where(eq(orders.id, id))
  return { ...existing, status: 'processing' as const, updatedAt: now }
}

export async function cancelOrder(id: number) {
  const db = await getDb()
  const existing = await getOrderById(id)
  if (!existing || (existing.status !== 'pending' && existing.status !== 'processing')) return null
  const now = new Date()
  await db.update(orders).set({ status: 'cancelled', updatedAt: now }).where(eq(orders.id, id))
  return { ...existing, status: 'cancelled' as const, updatedAt: now }
}

export async function completeOrder(id: number) {
  const db = await getDb()
  const existing = await getOrderById(id)
  if (!existing || existing.status !== 'processing') return null
  const now = new Date()
  await db.update(orders).set({ status: 'completed', updatedAt: now }).where(eq(orders.id, id))
  return { ...existing, status: 'completed' as const, updatedAt: now }
}

export async function seedOrders(count: number = 25) {
  const db = await getDb()
  const customers = [
    { name: '张三', email: 'zhangsan@example.com' },
    { name: '李四', email: 'lisi@example.com' },
    { name: '王五', email: 'wangwu@example.com' },
    { name: '赵六', email: 'zhaoliu@example.com' },
    { name: '钱七', email: 'qianqi@example.com' },
  ]
  const products = [
    '高级会员订阅',
    '专业版软件授权',
    '企业级解决方案',
    '数据分析服务',
    '技术支持套餐',
    '定制开发服务',
  ]
  const statuses = ['pending', 'processing', 'completed', 'cancelled', 'disputed'] as const

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)]
    const product = products[Math.floor(Math.random() * products.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const amount = Math.floor(Math.random() * 10000) + 100
    await db.insert(orders).values({
      orderNo: generateOrderNo(),
      userId: `user-${i + 1}`,
      customerName: customer.name,
      customerEmail: customer.email,
      productName: product,
      amount,
      status,
    })
  }
}
