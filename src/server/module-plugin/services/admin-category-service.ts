import { getDb } from '../../db'
import { pluginCategories, pluginCategoryMappings } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'
import { NotFoundError } from '../../utils/app-error'
import { generateUUID } from '../../utils/uuid'

type CategoryRow = typeof pluginCategories.$inferSelect
type MappingRow = typeof pluginCategoryMappings.$inferSelect

export async function createCategory(data: {
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  sortOrder?: number | null
}) {
  const db = await getDb()
  const id = generateUUID()

  await db.insert(pluginCategories).values({
    id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    icon: data.icon ?? null,
    sortOrder: data.sortOrder ?? 0,
  })

  const rows: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)
  return { ...rows[0], pluginCount: 0 }
}

export async function updateCategory(
  id: string,
  data: { name?: string | null; slug?: string | null; description?: string | null; icon?: string | null; sortOrder?: number | null }
) {
  const db = await getDb()
  const existing: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Category', id)
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.slug !== undefined) updateData.slug = data.slug
  if (data.description !== undefined) updateData.description = data.description
  if (data.icon !== undefined) updateData.icon = data.icon
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  await db.update(pluginCategories).set(updateData).where(eq(pluginCategories.id, id))

  const rows: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)
  return { ...rows[0], pluginCount: 0 }
}

export async function deleteCategory(id: string): Promise<{ id: string }> {
  const db = await getDb()
  const existing: CategoryRow[] = await db.select().from(pluginCategories).where(eq(pluginCategories.id, id)).limit(1)

  if (existing.length === 0) {
    throw new NotFoundError('Category', id)
  }

  await db.delete(pluginCategoryMappings).where(eq(pluginCategoryMappings.categoryId, id))
  await db.delete(pluginCategories).where(eq(pluginCategories.id, id))

  return { id }
}

export async function listCategoriesAdmin() {
  const db = await getDb()

  const cats: CategoryRow[] = await db
    .select()
    .from(pluginCategories)
    .orderBy(asc(pluginCategories.sortOrder), asc(pluginCategories.name))

  const mappingRows: MappingRow[] = await db.select().from(pluginCategoryMappings)

  const countMap = new Map<string, number>()
  for (const m of mappingRows) {
    countMap.set(m.categoryId, (countMap.get(m.categoryId) ?? 0) + 1)
  }

  return cats.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon: c.icon,
    sortOrder: c.sortOrder,
    pluginCount: countMap.get(c.id) ?? 0,
  }))
}
