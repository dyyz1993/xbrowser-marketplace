import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const contentStatuses = ['draft', 'published', 'archived'] as const
export type ContentStatus = (typeof contentStatuses)[number]

export const contentCategories = ['article', 'announcement', 'tutorial', 'news', 'policy'] as const
export type ContentCategory = (typeof contentCategories)[number]

export const contents = sqliteTable('contents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category', { enum: contentCategories }).notNull().default('article'),
  content: text('content').notNull(),
  summary: text('summary'),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  status: text('status', { enum: contentStatuses }).notNull().default('draft'),
  tags: text('tags'),
  viewCount: integer('view_count').default(0),
  likeCount: integer('like_count').default(0),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
