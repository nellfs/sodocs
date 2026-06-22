import { getSession } from '@/lib/auth/server'
import { getUserWorkspaces, getPageTree } from '@/lib/wiki/queries'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userWorkspaces = await getUserWorkspaces(session.user.id)
  const cookieStore = await cookies()
  const currentWorkspaceId =
    cookieStore.get('current-workspace-id')?.value ?? userWorkspaces[0]?.id

  if (!currentWorkspaceId) {
    return Response.json({ pages: [] })
  }

  const hasAccess = userWorkspaces.some((workspace) => workspace.id === currentWorkspaceId)
  if (!hasAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pages = await getPageTree(currentWorkspaceId)
  return Response.json({ pages })
}
