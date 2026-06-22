import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { pagesTable } from './pages.schema'
import { usersTable } from './users.schema'
import { workspacesTable } from './workspaces.schema'

export const pageViewsTable = pgTable('page_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pagesTable.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspacesTable.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
})
