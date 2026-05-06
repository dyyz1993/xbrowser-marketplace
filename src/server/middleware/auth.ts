import type { MiddlewareHandler } from 'hono'
import { createModuleLoggerSync } from '../utils/logger'
import { Role, Permission, getPermissionsByRole } from '@shared/modules/permission'
import { AuthenticationError, AuthorizationError } from '../utils/app-error'
import { getConfig } from '../config'

export type UserRole = Role

export interface AuthUser {
  id: string
  username: string
  email: string
  role: UserRole
  avatar?: string
  permissions: Permission[]
}

export interface AuthMiddlewareOptions {
  secretKey?: string
  requiredRole?: UserRole
  requiredPermissions?: Permission[]
}

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser
  }
}

const DEV_SECRET_KEY = 'dev-secret-key-change-in-production'

function getAuthSecret(): string {
  const config = getConfig()
  if (config.authSecretKey && config.authSecretKey !== DEV_SECRET_KEY) return config.authSecretKey
  if (config.authSecretKey) return config.authSecretKey

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET_KEY environment variable is required in production')
  }

  return DEV_SECRET_KEY
}

const isDevTokensEnabled = (): boolean => {
  return getConfig().enableDevTokens
}

function checkDevTokensEnabled(): void {
  if (getConfig().enableDevTokens) {
    console.warn('⚠️  WARNING: Dev tokens are ENABLED. Do not use in production!')
  }
}

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

function verifyDevToken(token: string): AuthUser | null {
  if (token === 'admin-token' || token === 'super-admin-token') {
    return {
      id: 'super-admin-1',
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: Role.SUPER_ADMIN,
      permissions: getPermissionsByRole(Role.SUPER_ADMIN),
    }
  }
  if (token === 'customer-service-token') {
    return {
      id: 'customer-service-1',
      username: 'customerservice',
      email: 'cs@example.com',
      role: Role.CUSTOMER_SERVICE,
      permissions: getPermissionsByRole(Role.CUSTOMER_SERVICE),
    }
  }
  if (token === 'user-token') {
    return {
      id: 'user-1',
      username: 'user',
      email: 'user@example.com',
      role: Role.USER,
      permissions: getPermissionsByRole(Role.USER),
    }
  }
  if (token.startsWith('test-super-admin-')) {
    return {
      id: token,
      username: `superadmin-${token}`,
      email: `superadmin-${token}@example.com`,
      role: Role.SUPER_ADMIN,
      permissions: getPermissionsByRole(Role.SUPER_ADMIN),
    }
  }
  if (token.startsWith('test-customer-service-')) {
    return {
      id: token,
      username: `cs-${token}`,
      email: `cs-${token}@example.com`,
      role: Role.CUSTOMER_SERVICE,
      permissions: getPermissionsByRole(Role.CUSTOMER_SERVICE),
    }
  }
  if (token.startsWith('test-user-')) {
    return {
      id: token,
      username: `user-${token}`,
      email: `user-${token}@example.com`,
      role: Role.USER,
      permissions: getPermissionsByRole(Role.USER),
    }
  }
  return null
}

function verifyToken(token: string, secretKey: string): AuthUser | null {
  if (secretKey === DEV_SECRET_KEY && isDevTokensEnabled()) {
    const devUser = verifyDevToken(token)
    if (devUser) {
      const log = createModuleLoggerSync('auth')
      log.warn(
        { userId: devUser.id, role: devUser.role },
        'DEV TOKEN USED - This should not appear in production!'
      )
      return devUser
    }
  }

  return null
}

async function verifyAdminToken(token: string): Promise<AuthUser | null> {
  if (!token.startsWith('adm.')) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null

  const [, userId, role, hexSig] = parts
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
  const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (hexSig !== expectedHex) return null

  const roleMap: Record<string, Role> = {
    super_admin: Role.SUPER_ADMIN,
    customer_service: Role.CUSTOMER_SERVICE,
    user: Role.USER,
  }

  const mappedRole = roleMap[role]
  if (!mappedRole) return null

  return {
    id: userId,
    username: userId === '1' ? 'superadmin' : userId === '2' ? 'customerservice' : 'user1',
    email: userId === '1' ? 'superadmin@example.com' : userId === '2' ? 'cs@example.com' : 'user1@example.com',
    role: mappedRole,
    permissions: getPermissionsByRole(mappedRole),
  }
}

async function verifyApiKey(token: string): Promise<AuthUser | null> {
  try {
    const { verifyApiKey: verifyDevKey } = await import('../module-auth/services/auth-service')
    const profile = await verifyDevKey(token)
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role as UserRole,
      permissions: getPermissionsByRole(Role.USER),
    }
  } catch {
    return null
  }
}

export function authMiddleware(options: AuthMiddlewareOptions = {}): MiddlewareHandler {
  const _secretKey = options.secretKey
  const log = createModuleLoggerSync('auth')
  checkDevTokensEnabled()

  return async (c, next) => {
    const secretKey = _secretKey ?? getAuthSecret()
    const authHeader = c.req.header('Authorization')
    const token = extractToken(authHeader)

    if (!token) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Missing auth token')
      throw AuthenticationError.tokenMissing()
    }

    const user = verifyToken(token, secretKey) || await verifyAdminToken(token) || await verifyApiKey(token)

    if (!user) {
      log.warn({ path: c.req.path, method: c.req.method }, 'Invalid auth token')
      throw AuthenticationError.tokenInvalid()
    }

    log.info({ userId: user.id, role: user.role, path: c.req.path }, 'User authenticated')

    if (options.requiredRole) {
      const roleHierarchy = {
        [Role.SUPER_ADMIN]: 3,
        [Role.CUSTOMER_SERVICE]: 2,
        [Role.USER]: 1,
      }
      const userLevel = roleHierarchy[user.role]
      const requiredLevel = roleHierarchy[options.requiredRole]

      if (userLevel < requiredLevel) {
        log.warn(
          {
            path: c.req.path,
            method: c.req.method,
            userRole: user.role,
            requiredRole: options.requiredRole,
          },
          'Insufficient role'
        )
        throw AuthorizationError.insufficientRole(user.role, options.requiredRole)
      }
    }

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      // 从数据库读取权限，而不是使用硬编码的权限
      const { permissionService } =
        await import('../module-permission/services/permission-service-impl')

      for (const requiredPermission of options.requiredPermissions) {
        const hasPermission = await permissionService.hasPermission(user.id, requiredPermission)
        if (!hasPermission) {
          log.warn(
            {
              path: c.req.path,
              method: c.req.method,
              userId: user.id,
              requiredPermission,
            },
            'Insufficient permission'
          )
          throw AuthorizationError.permissionDenied(requiredPermission)
        }
      }
    }

    c.set('authUser', user)
    await next()
  }
}

export function requireSuperAdminMiddleware(): MiddlewareHandler {
  return authMiddleware({ requiredRole: Role.SUPER_ADMIN })
}

export function requireCustomerServiceMiddleware(): MiddlewareHandler {
  return authMiddleware({ requiredRole: Role.CUSTOMER_SERVICE })
}

export function requirePermissionsMiddleware(...permissions: Permission[]): MiddlewareHandler {
  return authMiddleware({ requiredPermissions: permissions })
}
