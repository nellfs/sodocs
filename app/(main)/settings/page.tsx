import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/server'
import { getUserWorkspaces, getWorkspaceMembers } from '@/lib/wiki/queries'
import { isWorkspaceAdmin } from '@/lib/wiki/access'
import { InviteMemberForm } from './InviteMemberForm'
import { LogoutButton } from './LogoutButton'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}

async function SettingsContent() {
  const session = await getSession()
  if (!session) redirect('/login')

  const userWorkspaces = await getUserWorkspaces(session.user.id)
  if (!userWorkspaces.length) redirect('/onboarding')

  const cookieStore = await cookies()
  const currentWorkspaceId =
    cookieStore.get('current-workspace-id')?.value ?? userWorkspaces[0].id

  const currentWorkspace =
    userWorkspaces.find((w) => w.id === currentWorkspaceId) ?? userWorkspaces[0]

  const admin = await isWorkspaceAdmin(currentWorkspace.id, session)
  const members = await getWorkspaceMembers(currentWorkspace.id)

  const roleLabel: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Visualizador',
  }

  return (
    <div className="mx-auto max-w-2xl w-full px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Configurações — {currentWorkspace.name}</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <div className="rounded-md border px-4 py-3 space-y-1">
          <p className="text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <LogoutButton />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Membros</h2>

        <div className="rounded-md border divide-y">
          {members.map((member) => {
            const isYou = member.userId === session.user.id
            return (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <span className="min-w-0 pr-3">
                  <span className="block truncate text-sm font-medium">
                    {member.userName}
                    {isYou && <span className="text-muted-foreground font-normal"> (Você)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{member.userEmail}</span>
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {roleLabel[member.role] ?? member.role}
                </span>
              </div>
            )
          })}
        </div>

      </section>

      {admin && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Convidar membro</h2>
          <InviteMemberForm workspaceId={currentWorkspace.id} />
        </section>
      )}

    </div>
  )
}
