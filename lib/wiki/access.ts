import 'server-only'
import { cache } from 'react'
import { eq, and } from 'drizzle-orm'
import db from '@/lib/db'
import { pagePermissionsTable, pagesTable, workspaceMembersTable } from '@/lib/db/schemas'
import type { Session } from '@/lib/auth/types'

export const canViewPage = cache(
  async (pageId: string, session: Session | null): Promise<boolean> => {
    const [page] = await db
      .select({
        isPublic: pagesTable.isPublic,
        workspaceId: pagesTable.workspaceId,
        isArchived: pagesTable.isArchived,
      })
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId))
      .limit(1)

    if (!page || page.isArchived) return false
    if (page.isPublic) return true
    if (!session) return false

    const [member] = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, page.workspaceId),
          eq(workspaceMembersTable.userId, session.user.id),
        ),
      )
      .limit(1)

    if (member) return true

    const [permission] = await db
      .select({ id: pagePermissionsTable.id })
      .from(pagePermissionsTable)
      .where(
        and(
          eq(pagePermissionsTable.pageId, pageId),
          eq(pagePermissionsTable.userId, session.user.id),
        ),
      )
      .limit(1)

    return !!permission
  },
)

export const canEditPage = cache(
  async (pageId: string, session: Session | null): Promise<boolean> => {
    if (!session) return false

    const [page] = await db
      .select({ workspaceId: pagesTable.workspaceId })
      .from(pagesTable)
      .where(eq(pagesTable.id, pageId))
      .limit(1)

    if (!page) return false

    const [member] = await db
      .select({ role: workspaceMembersTable.role })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, page.workspaceId),
          eq(workspaceMembersTable.userId, session.user.id),
        ),
      )
      .limit(1)

    if (member?.role && member.role !== 'viewer') return true

    const [permission] = await db
      .select({ permission: pagePermissionsTable.permission })
      .from(pagePermissionsTable)
      .where(
        and(
          eq(pagePermissionsTable.pageId, pageId),
          eq(pagePermissionsTable.userId, session.user.id),
        ),
      )
      .limit(1)

    return permission?.permission === 'edit' || permission?.permission === 'admin'
  },
)

export const isWorkspaceAdmin = cache(
  async (workspaceId: string, session: Session | null): Promise<boolean> => {
    if (!session) return false

    const [member] = await db
      .select({ role: workspaceMembersTable.role })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, session.user.id),
        ),
      )
      .limit(1)

    return member?.role === 'owner' || member?.role === 'admin'
  },
)
