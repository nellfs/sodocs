import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { usersTable } from './users.schema'
import { workspacesTable } from './workspaces.schema'

export const pagesTable = pgTable(
  'pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspacesTable.id, { onDelete: 'cascade' }),
    // self-referential FK added via raw SQL in migration (Drizzle circular ref limitation)
    parentId: uuid('parent_id'),
    depth: integer('depth').notNull().default(0),
    position: integer('position').notNull().default(0),
    title: varchar('title', { length: 1000 }).notNull().default('Untitled'),
    slug: varchar('slug', { length: 1000 }).notNull(),
    // BlockNote Block[] stored as JSONB
    content: jsonb('content').$type<Record<string, unknown>[]>().default([]),
    contentText: text('content_text'),
    icon: varchar('icon', { length: 100 }),
    coverImage: text('cover_image'),
    isPublic: boolean('is_public').notNull().default(false),
    isExplicitlyPrivate: boolean('is_explicitly_private').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'restrict' }),
    lastEditedBy: text('last_edited_by').references(() => usersTable.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => [
    index('pages_workspace_parent_idx').on(table.workspaceId, table.parentId),
    index('pages_workspace_slug_idx').on(table.workspaceId, table.slug),
    index('pages_workspace_public_idx').on(table.workspaceId, table.isPublic),
  ],
)
