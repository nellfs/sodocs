import { relations } from 'drizzle-orm'
import { pagesTable } from './schemas/pages.schema'
import {
  workspacesTable,
  workspaceMembersTable,
} from './schemas/workspaces.schema'
import { usersTable } from './schemas/users.schema'

export const pagesRelations = relations(pagesTable, ({ one, many }) => ({
  workspace: one(workspacesTable, {
    fields: [pagesTable.workspaceId],
    references: [workspacesTable.id],
  }),
  parent: one(pagesTable, {
    fields: [pagesTable.parentId],
    references: [pagesTable.id],
    relationName: 'parentChildren',
  }),
  children: many(pagesTable, { relationName: 'parentChildren' }),
  creator: one(usersTable, {
    fields: [pagesTable.createdBy],
    references: [usersTable.id],
  }),
}))

export const workspacesRelations = relations(workspacesTable, ({ many }) => ({
  pages: many(pagesTable),
  members: many(workspaceMembersTable),
}))

export const workspaceMembersRelations = relations(
  workspaceMembersTable,
  ({ one }) => ({
    workspace: one(workspacesTable, {
      fields: [workspaceMembersTable.workspaceId],
      references: [workspacesTable.id],
    }),
    user: one(usersTable, {
      fields: [workspaceMembersTable.userId],
      references: [usersTable.id],
    }),
  }),
)
