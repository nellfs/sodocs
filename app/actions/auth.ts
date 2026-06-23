'use server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth, getSession } from '@/lib/auth/server'
import { headers } from 'next/headers'
import db from '@/lib/db'
import {
  workspaceInvitationsTable,
  workspaceMembersTable,
  workspacesTable,
} from '@/lib/db/schemas'
import { getWorkspaceMember } from '@/lib/wiki/queries'

export async function logoutAction() {
  const session = await getSession()
  if (session) {
    const headerStore = await headers()
    await auth.api.signOut({ headers: headerStore })
  }
  redirect('/login')
}

export async function getInviteInfo(token: string) {
  const [invitation] = await db
    .select({
      email: workspaceInvitationsTable.email,
      name: workspaceInvitationsTable.name,
      role: workspaceInvitationsTable.role,
      expiresAt: workspaceInvitationsTable.expiresAt,
      workspaceName: workspacesTable.name,
    })
    .from(workspaceInvitationsTable)
    .innerJoin(workspacesTable, eq(workspacesTable.id, workspaceInvitationsTable.workspaceId))
    .where(eq(workspaceInvitationsTable.token, token))
    .limit(1)

  if (!invitation) return { error: 'invalid' as const }
  if (invitation.expiresAt < new Date()) return { error: 'expired' as const }

  return {
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    workspaceName: invitation.workspaceName,
  }
}

export async function registerAndAcceptInvite(
  token: string,
  name: string,
  password: string,
) {
  const [invitation] = await db
    .select()
    .from(workspaceInvitationsTable)
    .where(eq(workspaceInvitationsTable.token, token))
    .limit(1)

  if (!invitation) throw new Error('Convite inválido')
  if (invitation.expiresAt < new Date()) throw new Error('Convite expirado')

  const headerStore = await headers()

  const signUpResult = await auth.api.signUpEmail({
    headers: headerStore,
    body: {
      name,
      email: invitation.email,
      password,
    },
  })

  if (!signUpResult?.user?.id) throw new Error('Erro ao criar conta')

  const existing = await getWorkspaceMember(invitation.workspaceId, signUpResult.user.id)
  if (!existing) {
    await db.insert(workspaceMembersTable).values({
      workspaceId: invitation.workspaceId,
      userId: signUpResult.user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    })
  }

  await db
    .delete(workspaceInvitationsTable)
    .where(eq(workspaceInvitationsTable.id, invitation.id))

  redirect('/wiki')
}
