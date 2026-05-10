import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { orders } from './orders'

export const disputeStatuses = ['pending', 'investigating', 'resolved', 'rejected'] as const
export type DisputeStatus = (typeof disputeStatuses)[number]

export const disputeTypes = [
  'refund',
  'product_quality',
  'service_quality',
  'delivery',
  'other',
] as const
export type DisputeType = (typeof disputeTypes)[number]

export const disputes = sqliteTable('disputes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  disputeNo: text('dispute_no').notNull().unique(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  userId: text('user_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  type: text('type', { enum: disputeTypes }).notNull().default('other'),
  status: text('status', { enum: disputeStatuses }).notNull().default('pending'),
  description: text('description').notNull(),
  resolution: text('resolution'),
  amount: integer('amount').notNull(),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  resolvedBy: text('resolved_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
