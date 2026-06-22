import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { pagesTable } from './pages.schema'
import { usersTable } from './users.schema'

export const userPageFavoritesTable = pgTable('user_page_favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pagesTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
