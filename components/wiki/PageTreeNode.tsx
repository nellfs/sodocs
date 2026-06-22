'use client'
import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronRight,
  FilePlus,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Globe2,
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { useNestTarget } from './DragContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  createPage,
  deletePage,
  duplicatePage,
  togglePageVisibility,
  updatePageTitle,
  updatePageIcon,
} from '@/app/actions/pages'
import { usePageTree } from './PageTreeContext'
import { MovePageDialog } from './MovePageDialog'
import { EmojiPicker } from './EmojiPicker'
import type { PageTreeNode } from '@/lib/wiki/types'

interface PageTreeNodeProps {
  page: PageTreeNode
  workspaceId: string
  activePath?: string
}

export function PageTreeNodeComponent({
  page,
  workspaceId,
  activePath,
}: PageTreeNodeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, dispatch } = usePageTree()
  const isCollapsed = state.collapsedIds.has(page.id)
  const hasChildren = page.children.length > 0
  const isActive = activePath === page.slug || pathname === `/wiki/${page.slug}`
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(page.title)
  const [moveOpen, setMoveOpen] = useState(false)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const pending = sessionStorage.getItem('wiki-rename-pending')
    if (pending === page.id) {
      sessionStorage.removeItem('wiki-rename-pending')
      window.setTimeout(() => {
        setRenameValue(page.title)
        setRenaming(true)
      }, 0)
    }
  }, [page.id, page.title])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })
  const nestTargetId = useNestTarget()
  const isNestTarget = nestTargetId === page.id

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    dispatch({ type: 'TOGGLE_COLLAPSE', id: page.id })
  }

  function handleClick() {
    router.push(`/wiki/${page.slug}`)
  }

  async function handleNewChild(e: React.MouseEvent) {
    e.stopPropagation()
    if (state.collapsedIds.has(page.id)) dispatch({ type: 'TOGGLE_COLLAPSE', id: page.id })
    try {
      const newPage = await createPage(workspaceId, page.id)
      sessionStorage.setItem('wiki-rename-pending', newPage.id)
      toast.success('Subpágina criada')
      router.push(`/wiki/${newPage.slug}?mode=edit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar página')
    }
  }

  async function handleRenameSubmit() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== page.title) {
      try {
        const { newSlug } = await updatePageTitle(page.id, trimmed)
        dispatch({ type: 'OPTIMISTIC_RENAME', id: page.id, title: trimmed, slug: newSlug })
        if (isActive) router.push(`/wiki/${newSlug}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao renomear página')
      }
    }
    setRenaming(false)
  }

  async function handleIconChange(emoji: string) {
    dispatch({ type: 'OPTIMISTIC_ICON', id: page.id, icon: emoji })
    try {
      await updatePageIcon(page.id, emoji)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar ícone')
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Arquivar esta página? Ela sairá da árvore, mas poderá ser restaurada depois.')) return
    try {
      dispatch({ type: 'OPTIMISTIC_DELETE', id: page.id })
      await deletePage(page.id)
      toast.success('Página arquivada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao arquivar página')
      router.refresh()
    }
  }

  async function handleDuplicate() {
    try {
      const copy = await duplicatePage(page.id)
      toast.success('Página duplicada')
      router.push(`/wiki/${copy.slug}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao duplicar página')
    }
  }

  async function handleToggleVisibility() {
    try {
      await togglePageVisibility(page.id, !page.isPublic)
      toast.success(page.isPublic ? 'Página privada' : 'Página publicada')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar visibilidade')
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
    >
      {/* Row */}
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-1 py-0.5 text-sm cursor-pointer select-none transition-colors',
          'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          isActive && 'bg-sidebar-accent text-sidebar-foreground font-medium',
          isNestTarget && 'ring-2 ring-inset ring-primary/50 bg-primary/5',
        )}
        onClick={handleClick}
      >
        {/* Collapse chevron */}
        <button
          onClick={handleToggle}
          className={cn(
            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded transition-all',
            'text-sidebar-foreground/30 hover:bg-sidebar-border hover:text-sidebar-foreground/70',
            !hasChildren && 'invisible',
            !isCollapsed && 'rotate-90',
          )}
        >
          <ChevronRight className="h-3 w-3" />
        </button>

        {/* Icon */}
        <EmojiPicker value={page.icon} onChange={handleIconChange}>
          <button
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-5 text-center text-[15px] leading-none hover:scale-110 transition-transform"
            title="Alterar ícone"
          >
            {page.icon ?? '📄'}
          </button>
        </EmojiPicker>

        {/* Title or rename input */}
        {renaming ? (
          <input
            ref={renameRef}
            className="flex-1 min-w-0 bg-background border border-sidebar-border rounded px-1.5 py-0.5 text-sm outline-none text-foreground"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit()
              if (e.key === 'Escape') setRenaming(false)
            }}
            onFocus={(e) => e.target.select()}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate">{page.title}</span>
        )}

        {page.isPublic && (
          <Globe2 className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400" />
        )}
        {!page.isPublic && page.isExplicitlyPrivate && (
          <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleNewChild}
            className="flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-border hover:text-sidebar-foreground transition-colors"
            title="Nova subpágina"
          >
            <FilePlus className="h-3 w-3" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-border hover:text-sidebar-foreground transition-colors focus-visible:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setRenameValue(page.title)
                  setRenaming(true)
                }}
              >
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate() }}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMoveOpen(true) }}>
                <FolderInput className="h-3.5 w-3.5 mr-2" /> Mover para…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleVisibility() }}>
                {page.isPublic ? (
                  <><EyeOff className="h-3.5 w-3.5 mr-2" /> Tornar privado nesta árvore</>
                ) : (
                  <><Eye className="h-3.5 w-3.5 mr-2" /> Publicar esta árvore</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); handleDelete() }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/30 hover:bg-sidebar-border hover:text-sidebar-foreground/60 transition-colors cursor-grab active:cursor-grabbing touch-none"
            title="Arrastar"
          >
            <GripVertical className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Children with tree guide line */}
      {!isCollapsed && hasChildren && (
        <div className="relative ml-[22px]">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-sidebar-border/70" />
          <div className="ml-px">
            {page.children.map((child) => (
              <PageTreeNodeComponent
                key={child.id}
                page={child}
                workspaceId={workspaceId}
                activePath={activePath}
              />
            ))}
          </div>
        </div>
      )}

      <MovePageDialog
        pageId={page.id}
        workspaceId={workspaceId}
        currentParentId={page.parentId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />
    </div>
  )
}
