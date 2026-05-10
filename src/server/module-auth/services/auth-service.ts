import { getDb } from '../../db'
import { developers } from '../../db/schema'
import { eq, or } from 'drizzle-orm'
import { generateUUID } from '../../utils/uuid'
import { ConflictError, NotFoundError, AuthenticationError } from '../../utils/app-error'
import { compareSync, hashSync } from 'bcryptjs'
import { toProfile } from '../../utils/profile'

export async function registerDeveloper(data: {
  username: string
  email: string
  password: string
}) {
  const db = await getDb()

  const existingEmail = await db
    .select()
    .from(developers)
    .where(eq(developers.email, data.email))
    .limit(1)

  if (existingEmail.length > 0) {
    throw new ConflictError('Email already registered')
  }

  const existingUsername = await db
    .select()
    .from(developers)
    .where(eq(developers.username, data.username))
    .limit(1)

  if (existingUsername.length > 0) {
    throw new ConflictError('Username already taken')
  }

  const id = generateUUID()
  const now = new Date()
  const passwordHash = hashSync(data.password, 10)

  await db.insert(developers).values({
    id,
    username: data.username,
    email: data.email,
    passwordHash,
    role: 'developer',
    apiKey: generateUUID(),
    createdAt: now,
    updatedAt: now,
  })

  const rows = await db.select().from(developers).where(eq(developers.id, id)).limit(1)
  return toProfile(rows[0])
}

export async function loginDeveloper(data: { account?: string; email?: string; password: string }) {
  const db = await getDb()
  const identifier = data.account || data.email || ''

  const rows = await db
    .select()
    .from(developers)
    .where(or(eq(developers.email, identifier), eq(developers.username, identifier)))
    .limit(1)

  if (rows.length === 0) {
    throw new AuthenticationError('Invalid account or password')
  }

  const dev = rows[0]

  if (!compareSync(data.password, dev.passwordHash)) {
    throw new AuthenticationError('Invalid account or password')
  }

  return {
    token: dev.apiKey,
    profile: toProfile(dev),
  }
}

export async function verifyApiKey(apiKey: string) {
  const db = await getDb()

  const rows = await db.select().from(developers).where(eq(developers.apiKey, apiKey)).limit(1)

  if (rows.length === 0) {
    throw new AuthenticationError('Invalid API key')
  }

  return toProfile(rows[0])
}

export async function getDeveloperById(id: string) {
  const db = await getDb()

  const rows = await db.select().from(developers).where(eq(developers.id, id)).limit(1)

  if (rows.length === 0) {
    throw new NotFoundError('Developer', id)
  }

  return toProfile(rows[0])
}
