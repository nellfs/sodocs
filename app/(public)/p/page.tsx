import Link from 'next/link'
import { BookOpen, Clock3, FileText, Globe2 } from 'lucide-react'
import { getPublicPages, getPublicPageTree } from '@/lib/wiki/queries'
import { PublicSearch } from '@/components/wiki/PublicSearch'
import type { PageTreeNode } from '@/lib/wiki/types'

export const metadata = {
  title: 'Documentação pública',
  description: 'Documentação pública da Somax Wiki',
}

export default async function PublicDocsHome() {
  const [recentPages, tree] = await Promise.all([
    getPublicPages(undefined, 12),
    getPublicPageTree(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="grid gap-8 md:grid-cols-[1fr_360px] md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              Portal público
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Documentação Somax
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Consulte guias, processos e referências publicados pela equipe Somax.
            </p>
          </div>
          <PublicSearch />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Navegação</h2>
          </div>
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma página publicada ainda.</p>
          ) : (
            <PublicTree nodes={tree} />
          )}
        </aside>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Atualizadas recentemente</h2>
          </div>
          <div className="divide-y">
            {recentPages.map((page) => (
              <Link
                key={page.id}
                href={`/p/${page.slug}`}
                className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-accent"
              >
                <span className="text-lg">{page.icon ?? '📄'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{page.title}</span>
                  <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {page.contentText || 'Página publicada sem resumo.'}
                  </span>
                </span>
                <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function PublicTree({ nodes }: { nodes: PageTreeNode[] }) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <div key={node.id}>
          <Link
            href={`/p/${node.slug}`}
            className="flex min-w-0 items-center gap-2 rounded-md border-l-2 border-transparent px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <span className="w-5 shrink-0 text-center text-sm leading-none">{node.icon ?? '📄'}</span>
            <span className="truncate">{node.title}</span>
          </Link>
          {node.children.length > 0 && (
            <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/70 pl-2">
              <PublicTree nodes={node.children} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
