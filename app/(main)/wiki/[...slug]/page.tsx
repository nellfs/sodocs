import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/server'
import {
  getPageBacklinks,
  getPageBySlug,
  getPageRevisions,
  getBreadcrumbs,
  getSlugAlias,
  getUserWorkspaces,
  isFavoritePage,
} from '@/lib/wiki/queries'
import { canEditPage } from '@/lib/wiki/access'
import { extractHeadingsFromBlocks } from '@/lib/wiki/utils'
import { Breadcrumb } from '@/components/wiki/Breadcrumb'
import { PageHeader } from '@/components/wiki/PageHeader'
import { PageViewer } from '@/components/editor/PageViewer'
import { PageEditor } from '@/components/editor/PageEditorLoader'
import { PageViewTracker } from '@/components/wiki/PageViewTracker'
import WikiPageLoading from './loading'

interface WikiPageProps {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<{ mode?: string }>
}

export default function WikiPage(props: WikiPageProps) {
  return (
    <Suspense fallback={<WikiPageLoading />}>
      <WikiPageContent {...props} />
    </Suspense>
  )
}

async function WikiPageContent({ params, searchParams }: WikiPageProps) {
  const { slug } = await params
  const { mode } = await searchParams

  const fullSlug = slug.join('/')
  const isEditMode = mode === 'edit'

  const session = await getSession()
  if (!session) notFound()

  const userWorkspaces = await getUserWorkspaces(session.user.id)
  if (!userWorkspaces.length) notFound()

  const cookieStore = await cookies()
  const currentWorkspaceId =
    cookieStore.get('current-workspace-id')?.value ?? userWorkspaces[0].id

  const page = await getPageBySlug(currentWorkspaceId, fullSlug)
  if (!page) {
    const alias = await getSlugAlias(currentWorkspaceId, fullSlug)
    if (alias && alias.currentSlug && !alias.isArchived) {
      redirect(`/wiki/${alias.currentSlug}${isEditMode ? '?mode=edit' : ''}`)
    }
  }
  if (!page) notFound()

  const editable = isEditMode && (await canEditPage(page.id, session))
  const canEdit = await canEditPage(page.id, session)

  const ancestors = await getBreadcrumbs(currentWorkspaceId, page.id)
  const content = (page.content ?? []) as Record<string, unknown>[]
  const headings = extractHeadingsFromBlocks(content)
  const [favorite, backlinks, revisions] = await Promise.all([
    isFavoritePage(session.user.id, page.id),
    getPageBacklinks(currentWorkspaceId, page.slug, page.id),
    canEdit ? getPageRevisions(page.id, 5) : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 xl:grid-cols-[minmax(0,760px)_260px]">
      <PageViewTracker pageId={page.id} />
      <article className="min-w-0">
        <div className="mb-6">
          <Breadcrumb
            ancestors={ancestors.map((a) => ({ id: a.id, title: a.title, slug: a.slug }))}
            currentTitle={page.title}
          />
        </div>

        <PageHeader
          pageId={page.id}
          title={page.title}
          icon={page.icon}
          isPublic={page.isPublic}
          isExplicitlyPrivate={page.isExplicitlyPrivate}
          isEditable={editable || canEdit}
          slug={page.slug}
          isFavorite={favorite}
        />

        {editable ? (
          <PageEditor
          pageId={page.id}
          initialContent={content}
          isEditable={true}
          pageIsPublic={page.isPublic}
        />
        ) : (
          <div>
            <PageViewer content={content} />
            {canEdit && (
              <div className="mt-8 flex justify-center">
                <Link
                  href={`/wiki/${fullSlug}?mode=edit`}
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Editar página
                </Link>
              </div>
            )}
          </div>
        )}
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-8 space-y-5">
          <SidePanel title="Nesta página">
            {headings.length === 0 ? (
              <p className="text-xs text-muted-foreground">Adicione títulos para gerar um sumário.</p>
            ) : (
              <nav className="space-y-1">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className="block truncate text-xs text-muted-foreground hover:text-foreground"
                    style={{ paddingLeft: `${Math.max(heading.level - 2, 0) * 10}px` }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            )}
          </SidePanel>

          <SidePanel title="Referências">
            {backlinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma página referencia esta ainda.</p>
            ) : (
              <div className="space-y-2">
                {backlinks.map((link) => (
                  <Link key={link.id} href={`/wiki/${link.slug}`} className="block truncate text-xs hover:text-primary">
                    {link.icon ?? '📄'} {link.title}
                  </Link>
                ))}
              </div>
            )}
          </SidePanel>

          {canEdit && (
            <SidePanel title="Histórico">
              {revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">O histórico começará após a próxima edição.</p>
              ) : (
                <div className="space-y-2">
                  {revisions.map((revision) => (
                    <div key={revision.id} className="text-xs">
                      <p className="truncate font-medium">{revision.title}</p>
                      <p className="text-muted-foreground">
                        {new Date(revision.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SidePanel>
          )}
        </div>
      </aside>
    </div>
  )
}

function SidePanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
