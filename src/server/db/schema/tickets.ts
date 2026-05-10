import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const ticketStatuses = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const
export type TicketStatus = (typeof ticketStatuses)[number]

export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const
export type TicketPriority = (typeof ticketPriorities)[number]

export const ticketCategories = [
  'technical',
  'billing',
  'feature_request',
  'bug_report',
  'general',
] as const
export type TicketCategory = (typeof ticketCategories)[number]

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketNo: text('ticket_no').notNull().unique(),
  userId: text('user_id').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ticketStatuses }).notNull().default('open'),
  priority: text('priority', { enum: ticketPriorities }).notNull().default('medium'),
  category: text('category', { enum: ticketCategories }).notNull().default('general'),
  assignedTo: text('assigned_to'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const ticketMessages = sqliteTable('ticket_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id),
  userId: text('user_id').notNull(),
  author: text('author').notNull(),
  content: text('content').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
