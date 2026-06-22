import { Suspense } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTree } from './PageTree'
import { NewPageButton } from './NewPageButton'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { SearchCommand } from './SearchCommand'
import type { PageTreeNode } from '@/lib/wiki/types'

interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

interface WikiSidebarProps {
  pages: PageTreeNode[]
  workspaceId: string
  workspaces: Workspace[]
  currentWorkspace: Workspace
  activePath?: string
  treeInstanceId?: string
}

export function WikiSidebar({
  pages,
  workspaceId,
  workspaces,
  currentWorkspace,
  activePath,
  treeInstanceId = 'default',
}: WikiSidebarProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Workspace header */}
      <div className="shrink-0 border-b border-sidebar-border px-2 py-1.5">
        <WorkspaceSwitcher workspaces={workspaces} currentWorkspace={currentWorkspace} />
      </div>

      {/* Quick nav */}
      <div className="shrink-0 px-2 py-2 space-y-0.5">
        <SearchCommand workspaceId={workspaceId} />
        <Link
          href="/settings"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Configurações
        </Link>
      </div>

      {/* Pages section */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-sidebar-border">
        <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 select-none">
            Páginas
          </span>
          <NewPageButton workspaceId={workspaceId} variant="icon" />
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 pb-4">
            <Suspense fallback={<SidebarSkeleton />}>
              <PageTree
                initialPages={pages}
                workspaceId={workspaceId}
                activePath={activePath}
                instanceId={treeInstanceId}
              />
            </Suspense>
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}

function SidebarSkeleton() {
  return (
    <div className="space-y-0.5 py-1">
      {[...Array(6)].map((_, i) => (
        <Skeleton
          key={i}
          className="h-7 rounded-md"
          style={{ width: `${75 + (i % 3) * 10}%`, marginLeft: i % 3 === 2 ? '20px' : '0' }}
        />
      ))}
    </div>
  )
}
