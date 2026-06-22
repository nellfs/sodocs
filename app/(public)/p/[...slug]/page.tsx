import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { cacheLife, cacheTag } from 'next/cache'
import type { Metadata } from 'next'
import { getPublicPageBySlug, getPublicPageTree, getPublicSlugAlias } from '@/lib/wiki/queries'
import { extractHeadingsFromBlocks } from '@/lib/wiki/utils'
import { PageViewer } from '@/components/editor/PageViewer'
import type { PageTreeNode } from '@/lib/wiki/types'

interface PublicPageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  'use cache'
  const { slug } = await params
  const fullSlug = slug.join('/')
  cacheTag(`page-meta-${fullSlug}`)
  cacheLife('minutes')

  let page = await getPublicPageBySlug(fullSlug)
  if (!page) {
    const alias = await getPublicSlugAlias(fullSlug)
    if (alias?.isPublic && !alias.isArchived) page = await getPublicPageBySlug(alias.currentSlug)
  }

  if (!page) return { title: 'Página não encontrada' }

  const description = page.contentText?.slice(0, 160) ?? `${page.title} — Somax Wiki`

  return {
    title: page.title,
    description,
    openGraph: { title: page.title, description, type: 'article' },
  }
}

export default function PublicPage(props: PublicPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl w-full px-6 py-12 space-y-4 animate-pulse">
          <div className="h-10 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="space-y-2 mt-8">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      }
    >
      <PublicPageContent {...props} />
    </Suspense>
  )
}

async function PublicPageContent({ params }: PublicPageProps) {
  'use cache'
  cacheLife('hours')

  const { slug } = await params
  const fullSlug = slug.join('/')
  cacheTag(`page-${fullSlug}`)

  const page = await getPublicPageBySlug(fullSlug)
  if (!page) {
    const alias = await getPublicSlugAlias(fullSlug)
    if (alias?.isPublic && !alias.isArchived) redirect(`/p/${alias.currentSlug}`)
  }
  if (!page) notFound()

  const content = (page.content ?? []) as Record<string, unknown>[]
  const headings = extractHeadingsFromBlocks(content)
  const tree = await getPublicPageTree(page.workspaceId)

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[260px_minmax(0,760px)_220px]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 rounded-lg border bg-card p-4 shadow-sm">
          <Link href="/p" className="mb-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentação
          </Link>
          <PublicTree nodes={tree} activeSlug={page.slug} />
        </div>
      </aside>

      <article className="min-w-0">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted text-2xl">
              {page.icon ?? '📄'}
            </span>
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          </div>
          {page.updatedAt && (
            <p className="text-sm text-muted-foreground">
              Atualizado em{' '}
              {new Date(page.updatedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

      <PageViewer content={content} />
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-20 rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nesta página
          </h2>
          {headings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem sumário.</p>
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
        </div>
      </aside>
    </div>
  )
}

function PublicTree({
  nodes,
  activeSlug,
}: {
  nodes: PageTreeNode[]
  activeSlug: string
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <div key={node.id}>
          <Link
            href={`/p/${node.slug}`}
            className={`flex min-w-0 items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm transition-colors ${
              node.slug === activeSlug
                ? 'border-primary bg-primary/5 font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            }`}
          >
            <span className="w-5 shrink-0 text-center text-sm leading-none">{node.icon ?? '📄'}</span>
            <span className="truncate">{node.title}</span>
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/70 pl-2">
              <PublicTree nodes={node.children} activeSlug={activeSlug} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
