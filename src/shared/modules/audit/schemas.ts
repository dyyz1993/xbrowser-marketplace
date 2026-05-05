import { z } from '@hono/zod-openapi'
import { RESOURCE_TYPES, ACTION_TYPES, type ResourceType, type ActionType } from '@shared/constants'

export const ResourceTypeSchema = z.enum(
  Object.values(RESOURCE_TYPES) as [ResourceType, ...ResourceType[]]
)
export const ActionTypeSchema = z.enum(Object.values(ACTION_TYPES) as [ActionType, ...ActionType[]])

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  action: ActionTypeSchema,
  resourceType: ResourceTypeSchema,
  resourceId: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform(v => (v instanceof Date ? v.toISOString() : v)),
})

export type AuditLogType = z.infer<typeof AuditLogSchema>
