import { Suspense } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { BookOpen, Clock3, FileText, Globe2, Star, WandSparkles } from 'lucide-react'
import { getUserWorkspaces, getWikiDashboard } from '@/lib/wiki/queries'
import { getSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { NewPageButton } from '@/components/wiki/NewPageButton'
import { SomaxLogo } from '@/components/brand/SomaxLogo'
import type { PageSummary } from '@/lib/wiki/types'

export default function WikiHomePage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-8 w-64" /></div>}>
      <WikiHomeContent />
    </Suspense>
  )
}

async function WikiHomeContent() {
  const session = await getSession()
  if (!session) redirect('/login')

  const userWorkspaces = await getUserWorkspaces(session.user.id)
  if (userWorkspaces.length === 0) redirect('/onboarding')

  const cookieStore = await cookies()
  const currentWorkspaceId =
    cookieStore.get('current-workspace-id')?.value ?? userWorkspaces[0].id

  const currentWorkspace =
    userWorkspaces.find((w) => w.id === currentWorkspaceId) ?? userWorkspaces[0]

  const dashboard = await getWikiDashboard(currentWorkspace.id, session.user.id)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <SomaxLogo className="h-7 w-7" iconClassName="h-4 w-4" />
            Somax Wiki
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {currentWorkspace.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Encontre, publique e mantenha conhecimento vivo para a equipe e para seus leitores externos.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <NewPageButton workspaceId={currentWorkspace.id} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Páginas" value={dashboard.stats.totalPages} />
        <StatCard icon={Globe2} label="Públicas" value={dashboard.stats.publicPages} />
        <StatCard icon={WandSparkles} label="Para completar" value={dashboard.stats.emptyPages} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PageSection title="Recentes" icon={Clock3} pages={dashboard.recentViews} empty="Abra páginas para criar seu histórico." />
        <PageSection title="Favoritas" icon={Star} pages={dashboard.favorites} empty="Marque páginas importantes com estrela." />
        <PageSection title="Atualizadas" icon={FileText} pages={dashboard.recentlyUpdated} empty="Nenhuma página ainda." />
        <PageSection title="Públicas" icon={Globe2} pages={dashboard.publicPages} empty="Publique uma página para aparecer aqui." />
        <PageSection title="Sem conteúdo" icon={WandSparkles} pages={dashboard.emptyPages} empty="Tudo parece preenchido." />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}

function PageSection({
  title,
  icon: Icon,
  pages,
  empty,
}: {
  title: string
  icon: React.ElementType
  pages: PageSummary[]
  empty: string
}) {
  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y">
        {pages.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>
        ) : (
          pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/70"
            >
              <span className="mt-0.5 text-base">{page.icon ?? '📄'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{page.title}</span>
                  {page.isPublic && <Globe2 className="h-3 w-3 shrink-0 text-sky-600" />}
                </span>
                <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {page.contentText || 'Sem conteúdo ainda'}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
