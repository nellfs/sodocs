'use client'
import { useEffect, useState } from 'react'
import { Home, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { movePage } from '@/app/actions/pages'
import { usePageTree } from './PageTreeContext'
import { useRouter } from 'next/navigation'

interface Page { id: string; title: string; icon: string | null; slug: string }

interface MovePageDialogProps {
  pageId: string
  workspaceId: string
  /** Current parentId so the root option can show as "already here" */
  currentParentId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MovePageDialog({
  pageId,
  workspaceId,
  currentParentId,
  open,
  onOpenChange,
}: MovePageDialogProps) {
  const router = useRouter()
  const { dispatch } = usePageTree()
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [moving, setMoving] = useState<string | 'root' | null>(null)

  useEffect(() => {
    if (!open) return
    fetch(`/api/pages/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setPages((d.results ?? []).filter((p: Page) => p.id !== pageId)))
      .catch(() => setPages([]))
  }, [query, open, pageId, workspaceId])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setPages([])
    }
    onOpenChange(nextOpen)
  }

  async function handleMove(targetId: string | null) {
    const key = targetId ?? 'root'
    setMoving(key)

    dispatch({
      type: 'OPTIMISTIC_MOVE',
      id: pageId,
      newParentId: targetId,
      newPosition: 0,
    })

    await movePage(pageId, targetId, 0)
    setMoving(null)
    handleOpenChange(false)
    router.refresh()
  }

  const isAtRoot = currentParentId === null || currentParentId === undefined

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="text-sm font-semibold">Mover para…</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar página..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="pl-8 h-8 text-sm border-sidebar-border bg-transparent focus-visible:ring-0 focus-visible:border-ring"
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {/* Root option — always visible, above the page list */}
          {(!query || 'raiz workspace'.includes(query.toLowerCase())) && (
            <div className="px-2 py-2 border-b border-border/50">
              <button
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-left transition-colors',
                  'hover:bg-accent',
                  isAtRoot && 'opacity-50 cursor-default',
                  moving === 'root' && 'opacity-60 pointer-events-none',
                )}
                onClick={() => !isAtRoot && handleMove(null)}
                disabled={moving !== null}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Home className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">Raiz do workspace</p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {isAtRoot ? 'Localização atual' : 'Página de nível superior'}
                  </p>
                </div>
                {moving === 'root' && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">Movendo…</span>
                )}
              </button>
            </div>
          )}

          {/* Pages list */}
          <div className="py-1">
            {pages.length > 0 && (
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
                Páginas
              </p>
            )}
            {pages.map((page) => (
              <button
                key={page.id}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-1.5 text-sm text-left transition-colors',
                  'hover:bg-accent',
                  moving === page.id && 'opacity-60 pointer-events-none',
                  currentParentId === page.id && 'opacity-50 cursor-default',
                )}
                onClick={() => currentParentId !== page.id && handleMove(page.id)}
                disabled={moving !== null}
              >
                <span className="text-[15px] leading-none shrink-0">{page.icon ?? '📄'}</span>
                <span className="flex-1 truncate">{page.title}</span>
                {currentParentId === page.id && (
                  <span className="text-[10px] text-muted-foreground shrink-0">atual</span>
                )}
                {moving === page.id && (
                  <span className="text-[10px] text-muted-foreground shrink-0">Movendo…</span>
                )}
              </button>
            ))}

            {pages.length === 0 && query.length >= 2 && (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">
                Nenhuma página encontrada
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
