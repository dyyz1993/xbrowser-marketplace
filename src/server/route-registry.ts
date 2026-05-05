import { OpenAPIHono } from '@hono/zod-openapi'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { permissionRoutes } from './module-permission/routes/permission-routes'
import { roleRoutes } from './module-permission/routes/role-routes'
import { auditLogRoutes } from './module-permission/routes/audit-log-routes'
import { notificationRoutes } from './module-notifications/routes/notification-routes'
import { adminRoutes } from './module-admin/routes/admin-routes'
import { captchaRoutes } from './module-captcha/routes/captcha-routes'
import { fileRoutes } from './module-file/routes/file-routes'
import { pluginRoutes } from './module-plugin/routes/plugin-routes'
import { publishRoutes } from './module-plugin/routes/publish-routes'
import { pluginAdminRoutes } from './module-plugin/routes/plugin-admin-routes'
import { authRoutes } from './module-auth/routes/auth-routes'

const apiRateLimit = rateLimitMiddleware({
  windowMs: 60_000,
  max: 100,
  message: 'Too many requests',
})

export const clientApiRoutes = new OpenAPIHono()
  .use('*', apiRateLimit)
  .route('/api', authRoutes)
  .route('/api', pluginRoutes)
  .route('/api', publishRoutes)
  .route('/api', notificationRoutes)

export const adminApiRoutes = new OpenAPIHono()
  .route('/api', fileRoutes)
  .route('/api', captchaRoutes)
  .route('/api', permissionRoutes)
  .route('/api', roleRoutes)
  .route('/api', auditLogRoutes)
  .route('/api', adminRoutes)
  .route('/api', pluginAdminRoutes)

export type ClientApiRoutes = typeof clientApiRoutes
export type AdminApiRoutes = typeof adminApiRoutes
