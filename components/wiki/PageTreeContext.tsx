'use client'
import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import type { PageTreeNode } from '@/lib/wiki/types'

type TreeState = {
  pages: PageTreeNode[]
  collapsedIds: Set<string>
  pendingPageId: string | null
}

type TreeAction =
  | { type: 'TOGGLE_COLLAPSE'; id: string }
  | { type: 'OPTIMISTIC_ADD'; page: PageTreeNode; parentId: string | null }
  | { type: 'OPTIMISTIC_RENAME'; id: string; title: string; slug: string }
  | { type: 'OPTIMISTIC_ICON'; id: string; icon: string }
  | { type: 'OPTIMISTIC_DELETE'; id: string }
  | { type: 'OPTIMISTIC_MOVE'; id: string; newParentId: string | null; newPosition: number }
  | { type: 'SET_PENDING'; id: string | null }
  | { type: 'SERVER_SYNC'; pages: PageTreeNode[] }

function insertNode(
  nodes: PageTreeNode[],
  parentId: string | null,
  newPage: PageTreeNode,
): PageTreeNode[] {
  if (parentId === null) return [...nodes, newPage]
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newPage] }
    }
    return { ...node, children: insertNode(node.children, parentId, newPage) }
  })
}

function deleteNode(nodes: PageTreeNode[], id: string): PageTreeNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: deleteNode(n.children, id) }))
}

function renameNode(nodes: PageTreeNode[], id: string, title: string, slug: string): PageTreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, title, slug }
    return { ...n, children: renameNode(n.children, id, title, slug) }
  })
}

function updateIconNode(nodes: PageTreeNode[], id: string, icon: string): PageTreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, icon }
    return { ...n, children: updateIconNode(n.children, id, icon) }
  })
}

function reducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'TOGGLE_COLLAPSE': {
      const next = new Set(state.collapsedIds)
      if (next.has(action.id)) next.delete(action.id)
      else next.add(action.id)
      return { ...state, collapsedIds: next }
    }
    case 'OPTIMISTIC_ADD':
      return {
        ...state,
        pages: insertNode(state.pages, action.parentId, action.page),
        pendingPageId: action.page.id,
      }
    case 'OPTIMISTIC_RENAME':
      return { ...state, pages: renameNode(state.pages, action.id, action.title, action.slug) }
    case 'OPTIMISTIC_ICON':
      return { ...state, pages: updateIconNode(state.pages, action.id, action.icon) }
    case 'OPTIMISTIC_DELETE':
      return { ...state, pages: deleteNode(state.pages, action.id) }
    case 'OPTIMISTIC_MOVE': {
      const { id, newParentId, newPosition } = action

      // Step 1: extract the node from wherever it currently lives
      let extracted: PageTreeNode | null = null
      function extract(nodes: PageTreeNode[]): PageTreeNode[] {
        const result: PageTreeNode[] = []
        for (const n of nodes) {
          if (n.id === id) {
            extracted = n
          } else {
            result.push({ ...n, children: extract(n.children) })
          }
        }
        return result
      }
      const withoutNode = extract(state.pages)
      if (!extracted) return state
      const node = extracted as PageTreeNode

      // Step 2: insert at the target location (handles both same- and cross-parent)
      function insertAt(nodes: PageTreeNode[], pid: string | null): PageTreeNode[] {
        if (pid === null) {
          const result = [...nodes]
          result.splice(newPosition, 0, { ...node, parentId: null, depth: 0 })
          return result
        }
        return nodes.map((n) => {
          if (n.id === pid) {
            const children = [...n.children]
            children.splice(newPosition, 0, { ...node, parentId: n.id, depth: n.depth + 1 })
            return { ...n, children }
          }
          return { ...n, children: insertAt(n.children, pid) }
        })
      }
      return { ...state, pages: insertAt(withoutNode, newParentId) }
    }
    case 'SET_PENDING':
      return { ...state, pendingPageId: action.id }
    case 'SERVER_SYNC':
      return { ...state, pages: action.pages }
    default:
      return state
  }
}

const STORAGE_KEY = 'wiki-tree-collapsed'

type TreeContextValue = {
  state: TreeState
  dispatch: React.Dispatch<TreeAction>
}

const TreeContext = createContext<TreeContextValue | null>(null)

export function PageTreeProvider({
  children,
  initialPages,
}: {
  children: ReactNode
  initialPages: PageTreeNode[]
}) {
  const [state, dispatch] = useReducer(reducer, {
    pages: initialPages,
    collapsedIds: new Set<string>(),
    pendingPageId: null,
  })

  // Sync when the server sends fresh tree data (after router.refresh() or navigation).
  // SERVER_SYNC preserves collapsedIds and pendingPageId.
  useEffect(() => {
    dispatch({ type: 'SERVER_SYNC', pages: initialPages })
  }, [initialPages])

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const ids: string[] = JSON.parse(stored)
        ids.forEach((id) => dispatch({ type: 'TOGGLE_COLLAPSE', id }))
      }
    } catch {}
  }, [])

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...state.collapsedIds]),
      )
    } catch {}
  }, [state.collapsedIds])

  return (
    <TreeContext.Provider value={{ state, dispatch }}>
      {children}
    </TreeContext.Provider>
  )
}

export function usePageTree() {
  const ctx = useContext(TreeContext)
  if (!ctx) throw new Error('usePageTree must be used inside PageTreeProvider')
  return ctx
}
