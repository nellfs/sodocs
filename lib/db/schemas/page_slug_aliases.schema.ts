import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { pagesTable } from './pages.schema'
import { workspacesTable } from './workspaces.schema'

export const pageSlugAliasesTable = pgTable('page_slug_aliases', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pagesTable.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspacesTable.id, { onDelete: 'cascade' }),
  oldSlug: varchar('old_slug', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
