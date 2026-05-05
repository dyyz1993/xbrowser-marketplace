import type { MiddlewareHandler } from 'hono'
import { getAuthUser } from '../utils/auth'
import { auditLogService } from '../module-permission/services/audit-log-service'
import { logger } from '../utils/logger'
import {
  PATH_TO_RESOURCE_TYPE,
  ACTION_TYPES,
  type ResourceType,
  type ActionType,
} from '@shared/constants'

const log = logger.api()

export function auditLogMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = Date.now()
    const path = c.req.path
    const method = c.req.method

    await next()

    const duration = Date.now() - startTime
    const status = c.res.status

    log.info(
      {
        path,
        method,
        status,
        duration,
      },
      'Audit log middleware checking'
    )

    if (!path.startsWith('/api/') || path.startsWith('/api/permissions/')) {
      log.info({ path }, 'Skipping: not API or public API')
      return
    }

    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      log.info({ method }, 'Skipping: not write operation')
      return
    }

    if (status < 200 || status >= 300) {
      log.info({ status }, 'Skipping: not successful operation')
      return
    }

    const user = getAuthUser(c)
    if (!user) {
      log.info({ path }, 'Skipping: no user')
      return
    }

    let action: ActionType = ACTION_TYPES.CREATE
    if (method === 'POST') {
      action = ACTION_TYPES.CREATE
    } else if (method === 'PUT' || method === 'PATCH') {
      action = ACTION_TYPES.UPDATE
    } else if (method === 'DELETE') {
      action = ACTION_TYPES.DELETE
    }

    const pathParts = path.split('/').filter(Boolean)
    let resourceType: ResourceType = 'user' as ResourceType
    if (pathParts.length >= 2) {
      const pathSegment = pathParts[1]
      resourceType = PATH_TO_RESOURCE_TYPE[pathSegment] || ('unknown' as ResourceType)
    }

    try {
      await auditLogService.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        action,
        resourceType,
        resourceId: pathParts.length >= 3 ? pathParts[2] : null,
        oldValue: null,
        newValue: null,
        ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
        userAgent: c.req.header('user-agent') || null,
      })

      log.info(
        {
          userId: user.id,
          action,
          resourceType,
          path,
          method,
          status,
          duration,
        },
        'Audit log created'
      )
    } catch (error) {
      log.error({ error, path, method }, 'Failed to create audit log')
    }
  }
}
