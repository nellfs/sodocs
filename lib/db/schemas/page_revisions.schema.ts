import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { pagesTable } from './pages.schema'
import { usersTable } from './users.schema'

export const pageRevisionsTable = pgTable('page_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pagesTable.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 1000 }).notNull(),
  content: jsonb('content').$type<Record<string, unknown>[]>().default([]),
  contentText: text('content_text'),
  createdBy: text('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
