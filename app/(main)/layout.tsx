import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/server'
import { getPageTree, getUserWorkspaces } from '@/lib/wiki/queries'
import { WikiSidebar } from '@/components/wiki/WikiSidebar'
import { MobileWikiNav } from '@/components/wiki/MobileWikiNav'
import { Skeleton } from '@/components/ui/skeleton'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <Suspense fallback={<SidebarFallback />}>
          <SidebarLoader variant="desktop" />
        </Suspense>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-12 border-b md:hidden" />}>
          <MobileWikiNav>
            <SidebarLoader variant="mobile" />
          </MobileWikiNav>
        </Suspense>
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

async function SidebarLoader({ variant }: { variant: 'desktop' | 'mobile' }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const userWorkspaces = await getUserWorkspaces(session.user.id)
  if (userWorkspaces.length === 0) redirect('/onboarding')

  const cookieStore = await cookies()
  const currentWorkspaceId =
    cookieStore.get('current-workspace-id')?.value ?? userWorkspaces[0].id

  const currentWorkspace =
    userWorkspaces.find((w) => w.id === currentWorkspaceId) ?? userWorkspaces[0]

  const pageTree = await getPageTree(currentWorkspace.id)

  const workspaces = userWorkspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    logoUrl: w.logoUrl ?? null,
  }))

  return (
    <WikiSidebar
      pages={pageTree}
      workspaceId={currentWorkspace.id}
      workspaces={workspaces}
      currentWorkspace={{
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        slug: currentWorkspace.slug,
        logoUrl: currentWorkspace.logoUrl ?? null,
      }}
      treeInstanceId={variant}
    />
  )
}

function SidebarFallback() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border px-3 py-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-7 w-full rounded-md" />
      </div>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <div className="px-3 space-y-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-7 rounded-md"
            style={{ width: `${80 - i * 5}%`, marginLeft: i === 1 || i === 2 ? '20px' : '0' }}
          />
        ))}
      </div>
    </aside>
  )
}
