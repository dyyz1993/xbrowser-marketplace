import { z } from '@hono/zod-openapi'
import { RoleEnum, PermissionEnum } from '@shared/modules/permission'

export const SystemStatsSchema = z.object({
  totalTodos: z.number(),
  pendingTodos: z.number(),
  completedTodos: z.number(),
  lastUpdated: z.string(),
  totalPlugins: z.number().nullable().default(0),
  pendingPlugins: z.number().nullable().default(0),
  approvedPlugins: z.number().nullable().default(0),
  rejectedPlugins: z.number().nullable().default(0),
  totalDownloads: z.number().nullable().default(0),
  totalViews: z.number().nullable().default(0),
  totalReviews: z.number().nullable().default(0),
  activeDevelopers: z.number().nullable().default(0),
})

export const HealthCheckSchema = z.object({
  database: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
})

export const RecentActivityItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  updatedAt: z.string(),
})

export const RecentActivitySchema = z.array(RecentActivityItemSchema)

export const AuthUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: RoleEnum,
  avatar: z.string().nullish(),
  permissions: z.array(PermissionEnum),
})

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
})

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  token: z.string(),
})

export const RegisterRequestSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: RoleEnum,
  status: z.enum(['active', 'inactive', 'locked']),
  avatar: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const UserListSchema = z.array(UserSchema)

export const UpdateUserRequestSchema = z.object({
  username: z.string().nullish(),
  email: z.string().email().nullish(),
  role: RoleEnum.nullish(),
  status: z.enum(['active', 'inactive', 'locked']).nullish(),
})

export const CreateUserRequestSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: RoleEnum,
  status: z.enum(['active', 'inactive', 'locked']).nullish().default('active'),
})

export const ClearTodosResultSchema = z.object({
  deletedCount: z.number(),
})

export const SuccessSchema = z.object({})

export const DownloadTokenSchema = z.object({
  token: z.string(),
  downloadUrl: z.string(),
  expiresIn: z.number(),
})

export const SettingItemSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
  updatedAt: z.string(),
})

export const SettingListSchema = z.array(SettingItemSchema)

export const UpdateSettingItemSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().nullish(),
})

export const BatchUpdateSettingsSchema = z.object({
  items: z.array(UpdateSettingItemSchema),
})

export const SingleSettingUpdateSchema = z.object({
  value: z.string(),
  description: z.string().nullish(),
})

export type SystemStats = z.infer<typeof SystemStatsSchema>
export type HealthCheck = z.infer<typeof HealthCheckSchema>
export type RecentActivityItem = z.infer<typeof RecentActivityItemSchema>
export type AuthUserResponse = z.infer<typeof AuthUserSchema>
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
export type User = z.infer<typeof UserSchema>
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>
export type ClearTodosResult = z.infer<typeof ClearTodosResultSchema>

export const OrderRowSchema = z.object({
  id: z.number(),
  orderNo: z.string(),
  userId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  productName: z.string(),
  amount: z.number(),
  status: z.string(),
  paymentMethod: z.string().nullish(),
  transactionId: z.string().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const OrderListSchema = z.object({
  items: z.array(OrderRowSchema),
  total: z.number(),
})

export const TicketMessageSchema = z.object({
  id: z.number(),
  ticketId: z.number(),
  userId: z.string(),
  author: z.string(),
  content: z.string(),
  isAdmin: z.boolean(),
  createdAt: z.number().nullish(),
})

export const TicketRowSchema = z.object({
  id: z.number(),
  ticketNo: z.string(),
  userId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  category: z.string(),
  assignedTo: z.string().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const TicketDetailSchema = TicketRowSchema.extend({
  messages: z.array(TicketMessageSchema),
})

export const TicketListSchema = z.object({
  items: z.array(TicketRowSchema),
  total: z.number(),
})

export const DisputeRowSchema = z.object({
  id: z.number(),
  disputeNo: z.string(),
  orderId: z.number(),
  userId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  type: z.string(),
  status: z.string(),
  description: z.string(),
  resolution: z.string().nullish(),
  amount: z.number(),
  resolvedAt: z.number().nullish(),
  resolvedBy: z.string().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const DisputeListSchema = z.object({
  items: z.array(DisputeRowSchema),
  total: z.number(),
})

export const ContentRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  category: z.string(),
  content: z.string(),
  summary: z.string().nullish(),
  authorId: z.string(),
  authorName: z.string(),
  status: z.string(),
  tags: z.string().nullish(),
  viewCount: z.number().nullish(),
  likeCount: z.number().nullish(),
  publishedAt: z.number().nullish(),
  createdAt: z.number().nullish(),
  updatedAt: z.number().nullish(),
})

export const ContentListSchema = z.object({
  items: z.array(ContentRowSchema),
  total: z.number(),
})

export const CreateContentSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  category: z.enum(['article', 'announcement', 'tutorial', 'news', 'policy']),
  content: z.string().min(1),
  summary: z.string().nullish(),
  authorId: z.string().min(1),
  authorName: z.string().min(1),
  tags: z.string().nullish(),
})

export const UpdateContentSchema = z.object({
  title: z.string().min(1).nullish(),
  slug: z.string().min(1).nullish(),
  category: z.enum(['article', 'announcement', 'tutorial', 'news', 'policy']).nullish(),
  content: z.string().min(1).nullish(),
  summary: z.string().nullish(),
  tags: z.string().nullish(),
})

export const DeletedResultSchema = z.object({ deleted: z.boolean() })

export const CountResultSchema = z.object({ count: z.number() })

export const SeedBodySchema = z.object({ count: z.number().nullish() }).nullish()

export const ReplyTicketSchema = z.object({ content: z.string().min(1), author: z.string().min(1) })

export const AssignTicketSchema = z.object({ assignedTo: z.string().min(1) })

export const ResolveDisputeSchema = z.object({
  resolution: z.string().min(1),
  resolvedBy: z.string().min(1),
})

export const RejectDisputeSchema = z.object({
  reason: z.string().min(1),
  rejectedBy: z.string().min(1),
})

export const OrderListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  status: z.string().nullish(),
  search: z.string().nullish(),
})

export const TicketListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  category: z.string().nullish(),
})

export const DisputeListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  status: z.string().nullish(),
  type: z.string().nullish(),
})

export const ContentListQuerySchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  category: z.string().nullish(),
  status: z.string().nullish(),
  search: z.string().nullish(),
})

export const IdParamSchema = z.object({ id: z.string() })

export const MonitorStatsSchema = z.object({
  totalUsers: z.number(),
  totalPlugins: z.number(),
  totalOrders: z.number(),
  totalTickets: z.number(),
  totalDisputes: z.number(),
  totalContents: z.number(),
  pendingPlugins: z.number(),
  openTickets: z.number(),
  pendingOrders: z.number(),
})

export const RecentActivityEntrySchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum(['plugin', 'order', 'ticket', 'dispute', 'user']),
  title: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

export const MonitorDataSchema = z.object({
  stats: MonitorStatsSchema,
  recentActivity: z.array(RecentActivityEntrySchema),
  health: z.object({
    database: z.enum(['connected', 'disconnected']),
    uptime: z.number(),
  }),
})

export type MonitorStats = z.infer<typeof MonitorStatsSchema>
export type RecentActivityEntry = z.infer<typeof RecentActivityEntrySchema>
export type MonitorData = z.infer<typeof MonitorDataSchema>
