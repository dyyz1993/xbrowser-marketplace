import { getDb } from '../../db'
import { plugins, pluginReviews, developers } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'
import { NotFoundError } from '../../utils/app-error'

export async function promoteToAdmin(
  email: string,
  newUsername: string
): Promise<{ id: string; username: string; role: string }> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(developers)
    .where(sql`${developers.email} = ${email}`)
    .limit(1)
  if (rows.length === 0) {
    throw new NotFoundError('Developer', email)
  }
  await db
    .update(developers)
    .set({ role: 'super_admin', username: newUsername, updatedAt: new Date() })
    .where(eq(developers.id, rows[0].id))
  return { id: rows[0].id, username: newUsername, role: 'super_admin' }
}

export async function listAllDevelopers(): Promise<
  Array<{ id: string; username: string; email: string; role: string }>
> {
  const db = await getDb()
  const rows = await db.select().from(developers)
  return rows.map(r => ({ id: r.id, username: r.username, email: r.email, role: r.role }))
}

export async function resetSeedPluginCounts(slugs: string[]): Promise<{ reset: number }> {
  const db = await getDb()
  let reset = 0
  for (const slug of slugs) {
    await db
      .update(plugins)
      .set({ downloadCount: 0, viewCount: 0, updatedAt: new Date() })
      .where(eq(plugins.slug, slug))
    reset++
  }
  return { reset }
}

export async function cleanupTestReviews(): Promise<{ deleted: number }> {
  const db = await getDb()
  const testNames = ['e2e-tester', 'e2e-full-test']
  let deleted = 0
  for (const name of testNames) {
    await db.delete(pluginReviews).where(sql`${pluginReviews.userName} = ${name}`)
    deleted++
  }
  return { deleted }
}
