export type PageTreeNode = {
  id: string
  title: string
  slug: string
  icon: string | null
  isPublic: boolean
  isExplicitlyPrivate?: boolean
  publishedAt?: Date | null
  parentId: string | null
  position: number
  depth: number
  children: PageTreeNode[]
}

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type PagePermission = 'read' | 'edit' | 'admin'

export type PageSummary = {
  id: string
  title: string
  slug: string
  icon: string | null
  isPublic: boolean
  updatedAt: Date
  contentText: string | null
}
