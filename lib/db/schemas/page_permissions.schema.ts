import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { usersTable } from './users.schema'
import { pagesTable } from './pages.schema'

export const pagePermissionsTable = pgTable('page_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pagesTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  permission: varchar('permission', { length: 50 }).notNull(),
  grantedBy: text('granted_by').references(() => usersTable.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
