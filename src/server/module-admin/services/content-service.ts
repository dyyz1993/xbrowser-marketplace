import { getDb } from '@server/db'
import { contents } from '@server/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

export async function getContents(filters?: {
  category?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}): Promise<{ items: (typeof contents.$inferSelect)[]; total: number }> {
  const db = await getDb()
  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const offset = (page - 1) * limit

  const conditions = []
  if (filters?.category) conditions.push(eq(contents.category, filters.category))
  if (filters?.status) conditions.push(eq(contents.status, filters.status))
  if (filters?.search) {
    conditions.push(
      sql`(${contents.title} LIKE ${'%' + filters.search + '%'} OR ${contents.content} LIKE ${'%' + filters.search + '%'})`
    )
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(contents)
      .where(where)
      .orderBy(desc(contents.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(contents)
      .where(where),
  ])

  return { items, total: countResult[0]?.count ?? 0 }
}

export async function getContentById(id: number) {
  const db = await getDb()
  const result = await db.select().from(contents).where(eq(contents.id, id)).limit(1)
  return result[0] ?? null
}

export async function createContent(data: {
  title: string
  slug: string
  category: string
  content: string
  summary?: string
  authorId: string
  authorName: string
  tags?: string
}) {
  const db = await getDb()
  const result = await db.insert(contents).values(data).returning()
  return result[0]
}

export async function updateContent(id: number, data: Partial<typeof contents.$inferInsert>) {
  const db = await getDb()
  const existing = await getContentById(id)
  if (!existing) return null
  const now = new Date()
  const result = await db
    .update(contents)
    .set({ ...data, updatedAt: now })
    .where(eq(contents.id, id))
    .returning()
  return result[0]
}

export async function deleteContent(id: number) {
  const db = await getDb()
  const existing = await getContentById(id)
  if (!existing) return false
  await db.delete(contents).where(eq(contents.id, id))
  return true
}

export async function publishContent(id: number) {
  const db = await getDb()
  const existing = await getContentById(id)
  if (!existing || existing.status !== 'draft') return null
  const now = new Date()
  const result = await db
    .update(contents)
    .set({ status: 'published', publishedAt: now, updatedAt: now })
    .where(eq(contents.id, id))
    .returning()
  return result[0]
}

export async function archiveContent(id: number) {
  const db = await getDb()
  const existing = await getContentById(id)
  if (!existing || existing.status !== 'published') return null
  const now = new Date()
  const result = await db
    .update(contents)
    .set({ status: 'archived', updatedAt: now })
    .where(eq(contents.id, id))
    .returning()
  return result[0]
}
