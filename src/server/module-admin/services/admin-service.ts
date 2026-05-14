import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { eq } from 'drizzle-orm'
import { getMockUsers } from '../../utils/auth'
import { Role, getPermissionsByRole } from '@shared/modules/permission'
import { getConfig } from '../../config'

async function createAdminToken(userId: string, role: string): Promise<string> {
  const secretKey = getConfig().authSecretKey
  const data = `${userId}.${role}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `adm.${userId}.${role}.${hex}`
}
import type {
  SystemStats,
  HealthCheck,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UpdateUserRequest,
  CreateUserRequest,
} from '@shared/modules/admin'
import { LRUCache } from '../../utils/lru-cache'

export async function getSystemStats(): Promise<SystemStats> {
  const db = await getDb()

  const { plugins: pluginTable } = await import('../../db/schema')

  const [
    allPlugins,
    pendingPlugins,
    approvedPlugins,
    rejectedPlugins,
    reviewRows,
  ] = await Promise.all([
    db.select().from(pluginTable),
    db.select().from(pluginTable).where(eq(pluginTable.status, 'pending')),
    db.select().from(pluginTable).where(eq(pluginTable.status, 'approved')),
    db.select().from(pluginTable).where(eq(pluginTable.status, 'rejected')),
    (async () => {
      try {
        const { pluginReviews } = await import('../../db/schema')
        return db.select().from(pluginReviews)
      } catch {
        return []
      }
    })(),
  ])

  const totalDownloads = allPlugins.reduce((sum, p) => sum + (p.downloadCount ?? 0), 0)
  const totalViews = allPlugins.reduce((sum, p) => sum + (p.viewCount ?? 0), 0)
  const activeDevelopers = new Set(allPlugins.map(p => p.authorId)).size

  return {
    lastUpdated: new Date().toISOString(),
    totalPlugins: allPlugins.length,
    pendingPlugins: pendingPlugins.length,
    approvedPlugins: approvedPlugins.length,
    rejectedPlugins: rejectedPlugins.length,
    totalDownloads,
    totalViews,
    totalReviews: reviewRows.length,
    activeDevelopers,
  }
}

export async function checkDatabaseHealth(): Promise<HealthCheck> {
  try {
    const db = await getDb()
    const { plugins } = await import('../../db/schema')
    await db.select().from(plugins).limit(1)
    return {
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    }
  }
}

function getMockPasswordHash(): string {
  return getConfig().mockPasswordHash
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const mockUsers = getMockUsers()
  const user = mockUsers.find(u => u.username === data.username)

  if (!user || !(await bcrypt.compare(data.password, getMockPasswordHash()))) {
    throw new Error('Invalid credentials')
  }

  const token = await createAdminToken(user.id, user.role)

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      permissions: getPermissionsByRole(user.role as Role),
    },
    token,
  }
}

export async function register(data: RegisterRequest): Promise<User> {
  const mockUsers = getMockUsers()
  const existingUser = mockUsers.find(u => u.username === data.username || u.email === data.email)

  if (existingUser) {
    throw new Error('User already exists')
  }

  const newUser: User = {
    id: String(mockUsers.length + 1),
    username: data.username,
    email: data.email,
    role: Role.USER,
    status: 'active',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockUsers.push(newUser)

  return newUser
}

export async function getUsers(): Promise<User[]> {
  return getMockUsers()
}

export async function getUserById(id: string): Promise<User | null> {
  const mockUsers = getMockUsers()
  return mockUsers.find(u => u.id === id) || null
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const mockUsers = getMockUsers()
  const userIndex = mockUsers.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
  )

  const updatedUser: User = {
    ...mockUsers[userIndex],
    ...filteredData,
    updatedAt: new Date().toISOString(),
  }

  mockUsers[userIndex] = updatedUser

  return updatedUser
}

export async function deleteUser(id: string): Promise<void> {
  const mockUsers = getMockUsers()
  const userIndex = mockUsers.findIndex(u => u.id === id)

  if (userIndex === -1) {
    throw new Error('User not found')
  }

  mockUsers.splice(userIndex, 1)
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const mockUsers = getMockUsers()

  const existingUser = mockUsers.find(u => u.username === data.username || u.email === data.email)
  if (existingUser) {
    throw new Error('User with this username or email already exists')
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    username: data.username,
    email: data.email,
    role: data.role,
    status: data.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockUsers.push(newUser)
  return newUser
}

const avatarCache = new LRUCache<{ data: Blob; contentType: string }>(50, 30 * 60 * 1000)
const iconCache = new LRUCache<string>(100, 60 * 60 * 1000)

export async function getAvatar(id: string): Promise<{ data: Blob; contentType: string } | null> {
  const cached = avatarCache.get(id)
  if (cached) {
    return cached
  }
  const response = await fetch(`https://api.dicebear.com/7.x/avataaars/png?seed=${id}`)
  if (!response.ok) {
    return null
  }
  const data = await response.blob()
  const result = { data, contentType: 'image/png' }
  avatarCache.set(id, result)
  return result
}

export async function getIcon(name: string): Promise<string | null> {
  const cached = iconCache.get(name)
  if (cached) {
    return cached
  }
  const icons: Record<string, string> = {
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 6 6 6-6 9 9 6-6-9-9z"></path><path d="M9 21l6-6 6 6-6 9 9 6-6 9-9z"></path></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 3 3 3 3 3 0 0 6.3 6.3A1.65 1.65 0 0 3 3 3 3 3 0 0 6.3 6.3a1.65 1.65 0 0 3 3 3 3 3 0 0 6.3 6.3z"></path></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0 1-3 1H4a4 4 0 0 0 1 3v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M16 11.37A4 4 0 1 1.8 2.44L8 2.44A4 4 0 1 1.8 2z"></path></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 6c0 1.1.9 2.1 2.1-2 2.1-.9.9-.9 2.1-2 2.1A6 6 0 0 0 6-6 7-9l1-1.1c.7-.7 1.9-2 2.1-.9-.9-.9-2.1-2-2.1A6 6 0 0 0-6 6-7 9l-1 1.1c-.7.7-1.9 2-2.1.9.9.9 2.1 2 2.1z"></path><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="15" y1="12"></line><line x1="15" y1="9"></line></svg>`,
  }
  const svg = icons[name]
  if (!svg) {
    return null
  }
  iconCache.set(name, svg)
  return svg
}
