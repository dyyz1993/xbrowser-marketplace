import { sqliteTable, integer, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const pluginStatuses = ['pending', 'approved', 'rejected', 'removed'] as const;
export type PluginStatus = (typeof pluginStatuses)[number];

export const plugins = sqliteTable('plugins', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  readme: text('readme'),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  repositoryUrl: text('repository_url'),
  homepageUrl: text('homepage_url'),
  npmPackage: text('npm_package'),
  license: text('license').default('MIT'),
  version: text('version').notNull(),
  status: text('status', { enum: pluginStatuses }).notNull().default('pending'),
  downloadCount: integer('download_count').default(0),
  viewCount: integer('view_count').default(0),
  featured: integer('featured', { mode: 'boolean' }).default(false),
  screenshotUrl: text('screenshot_url'),
  siteUrls: text('site_urls'),
  tags: text('tags'),
  commands: text('commands'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const pluginVersions = sqliteTable('plugin_versions', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id')
    .notNull()
    .references(() => plugins.id),
  version: text('version').notNull(),
  changelog: text('changelog'),
  packageUrl: text('package_url'),
  fileSize: integer('file_size'),
  checksum: text('checksum'),
  status: text('status', { enum: pluginStatuses }).notNull().default('pending'),
  publishedAt: integer('published_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const pluginReviews = sqliteTable('plugin_reviews', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id')
    .notNull()
    .references(() => plugins.id),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  rating: integer('rating').notNull(),
  title: text('title'),
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const pluginCategories = sqliteTable('plugin_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
});

export const pluginCategoryMappings = sqliteTable(
  'plugin_category_mappings',
  {
    pluginId: text('plugin_id')
      .notNull()
      .references(() => plugins.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => pluginCategories.id),
  },
  (table) => [
    uniqueIndex('idx_plugin_category_unique').on(table.pluginId, table.categoryId),
    index('idx_pcm_category').on(table.categoryId),
  ]
);

export type PluginTable = typeof plugins.$inferSelect;
export type NewPlugin = typeof plugins.$inferInsert;
export type PluginVersionTable = typeof pluginVersions.$inferSelect;
export type NewPluginVersion = typeof pluginVersions.$inferInsert;
export type PluginReviewTable = typeof pluginReviews.$inferSelect;
export type NewPluginReview = typeof pluginReviews.$inferInsert;
export type PluginCategoryTable = typeof pluginCategories.$inferSelect;
export type NewPluginCategory = typeof pluginCategories.$inferInsert;
