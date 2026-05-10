import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthUser } from '../../middleware/auth'
import { authRoutes } from './auth-routes'
import { userManagementRoutes } from './user-management-routes'
import { adminNotificationRoutes } from './admin-notification-routes'
import { mediaRoutes } from './media-routes'
import { exportRoutes } from './export-routes'
import { systemRoutes } from './system-routes'
import { orderRoutes } from './order-routes'
import { ticketRoutes } from './ticket-routes'
import { disputeRoutes } from './dispute-routes'
import { contentRoutes } from './content-routes'
import { settingsRoutes } from './settings-routes'
import { monitorRoutes } from './monitor-routes'

const adminBase1 = new OpenAPIHono<{ Variables: { authUser: AuthUser } }>()
  .route('/', authRoutes)
  .route('/', userManagementRoutes)

const adminBase2 = adminBase1.route('/', adminNotificationRoutes).route('/', mediaRoutes)

const adminBase3 = adminBase2.route('/', exportRoutes).route('/', systemRoutes)

const adminBase4 = adminBase3.route('/', orderRoutes).route('/', ticketRoutes)

const adminBase5 = adminBase4.route('/', disputeRoutes).route('/', contentRoutes)

const adminBase6 = adminBase5.route('/', settingsRoutes).route('/', monitorRoutes)

export const adminRoutes = adminBase6

export default adminRoutes
