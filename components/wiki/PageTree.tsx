'use client'
import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { PageTreeProvider, usePageTree } from './PageTreeContext'
import { PageTreeNodeComponent } from './PageTreeNode'
import { NestTargetContext } from './DragContext'
import { reorderPages, movePage } from '@/app/actions/pages'
import type { PageTreeNode } from '@/lib/wiki/types'

interface PageTreeProps {
  initialPages: PageTreeNode[]
  workspaceId: string
  activePath?: string
  instanceId?: string
}

function findNode(nodes: PageTreeNode[], id: string): PageTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const f = findNode(n.children, id)
    if (f) return f
  }
  return null
}

// Returns true if nodeId appears in the subtree rooted at ancestorId
function isDescendantOf(parentMap: Map<string, string | null>, ancestorId: string, nodeId: string): boolean {
  let cur = parentMap.get(nodeId)
  while (cur != null) {
    if (cur === ancestorId) return true
    cur = parentMap.get(cur)
  }
  return false
}

function TreeDnd({
  workspaceId,
  activePath,
  instanceId = 'default',
}: Omit<PageTreeProps, 'initialPages'>) {
  const { state, dispatch } = usePageTree()
  const [activeId, setActiveId] = useState<string | null>(null)
  // ID of the page that will receive the dragged item as a child on drop
  const [nestTargetId, setNestTargetId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // id → parentId (every node, including collapsed)
  const parentMap = useMemo(() => {
    const map = new Map<string, string | null>()
    function traverse(nodes: PageTreeNode[], pid: string | null) {
      for (const n of nodes) { map.set(n.id, pid); traverse(n.children, n.id) }
    }
    traverse(state.pages, null)
    return map
  }, [state.pages])

  // parentId → children array
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, PageTreeNode[]>()
    function traverse(nodes: PageTreeNode[], pid: string | null) {
      map.set(pid, nodes)
      for (const n of nodes) traverse(n.children, n.id)
    }
    traverse(state.pages, null)
    return map
  }, [state.pages])

  // Flat ordered list of visible IDs (respects collapse state)
  const visibleIds = useMemo(() => {
    const ids: string[] = []
    function traverse(nodes: PageTreeNode[]) {
      for (const n of nodes) {
        ids.push(n.id)
        if (!state.collapsedIds.has(n.id)) traverse(n.children)
      }
    }
    traverse(state.pages)
    return ids
  }, [state.pages, state.collapsedIds])

  const activeNode = useMemo(
    () => (activeId ? findNode(state.pages, activeId) : null),
    [activeId, state.pages],
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setNestTargetId(null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) { setNestTargetId(null); return }

    const activePid = parentMap.get(active.id as string)
    const overPid = parentMap.get(over.id as string)

    // Cross-parent → will nest; same-parent → will reorder
    setNestTargetId(activePid !== overPid ? (over.id as string) : null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    const capturedNest = nestTargetId
    setNestTargetId(null)
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string
    const activePid = parentMap.get(activeId)
    const overPid = parentMap.get(overId)

    const isNesting = capturedNest === overId && activePid !== overPid

    if (isNesting) {
      // Guard: prevent dropping a page onto its own descendant (circular ref)
      if (isDescendantOf(parentMap, activeId, overId)) return

      const newPos = (childrenMap.get(overId) ?? []).length

      dispatch({ type: 'OPTIMISTIC_MOVE', id: activeId, newParentId: overId, newPosition: newPos })

      // Expand the target so the moved page is immediately visible
      if (state.collapsedIds.has(overId)) {
        dispatch({ type: 'TOGGLE_COLLAPSE', id: overId })
      }

      await movePage(activeId, overId, newPos)
    } else {
      // Same-parent reorder
      if (activePid !== overPid) return

      const siblings = childrenMap.get(activePid ?? null) ?? []
      const oldIdx = siblings.findIndex((p) => p.id === activeId)
      const newIdx = siblings.findIndex((p) => p.id === overId)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return

      dispatch({ type: 'OPTIMISTIC_MOVE', id: activeId, newParentId: activePid ?? null, newPosition: newIdx })
      await reorderPages(arrayMove(siblings, oldIdx, newIdx).map((p) => p.id))
    }
  }

  return (
    <NestTargetContext.Provider value={nestTargetId}>
      <DndContext
        id={`wiki-tree-${workspaceId}-${instanceId}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
          <div className="py-1">
            {state.pages.length === 0 ? (
              <p className="px-2 py-3 text-xs text-sidebar-foreground/40 text-center">
                Nenhuma página ainda
              </p>
            ) : (
              state.pages.map((page) => (
                <PageTreeNodeComponent
                  key={page.id}
                  page={page}
                  workspaceId={workspaceId}
                  activePath={activePath}
                />
              ))
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeNode && (
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-border bg-sidebar px-2 py-1 text-sm shadow-md text-sidebar-foreground max-w-[200px]">
              <span className="shrink-0 text-[14px]">{activeNode.icon ?? '📄'}</span>
              <span className="truncate">{activeNode.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </NestTargetContext.Provider>
  )
}

export function PageTree({
  initialPages,
  workspaceId,
  activePath,
  instanceId,
}: PageTreeProps) {
  return (
    <PageTreeProvider initialPages={initialPages}>
      <TreeDnd workspaceId={workspaceId} activePath={activePath} instanceId={instanceId} />
    </PageTreeProvider>
  )
}
