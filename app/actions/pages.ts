'use server'
import { revalidateTag, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { and, eq, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import db from '@/lib/db'
import {
  pageRevisionsTable,
  pageSlugAliasesTable,
  pageViewsTable,
  pagesTable,
  userPageFavoritesTable,
  workspacesTable,
  workspaceMembersTable,
  workspaceInvitationsTable,
} from '@/lib/db/schemas'
import { getSession } from '@/lib/auth/server'
import { canEditPage, isWorkspaceAdmin } from '@/lib/wiki/access'
import { extractTextFromBlocks, extractWikiLinkSlugsFromBlocks, slugFromTitle } from '@/lib/wiki/utils'
import { getNextPosition, getWorkspaceMember } from '@/lib/wiki/queries'

type PageTemplate = 'blank' | 'technical-doc' | 'meeting' | 'process' | 'faq' | 'release-note'

function templateBlocks(template: PageTemplate): Record<string, unknown>[] {
  const paragraph = (text = '') => ({
    id: nanoid(8),
    type: 'paragraph',
    props: {},
    content: text ? [{ type: 'text', text, styles: {} }] : [],
    children: [],
  })

  const heading = (text: string, level = 2) => ({
    id: nanoid(8),
    type: 'heading',
    props: { level },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  })

  switch (template) {
    case 'technical-doc':
      return [
        heading('Resumo', 2),
        paragraph('Contexto, problema e objetivo desta documentação.'),
        heading('Arquitetura', 2),
        paragraph(),
        heading('Decisões', 2),
        paragraph(),
        heading('Referências', 2),
        paragraph(),
      ]
    case 'meeting':
      return [
        heading('Participantes', 2),
        paragraph(),
        heading('Agenda', 2),
        paragraph(),
        heading('Decisões', 2),
        paragraph(),
        heading('Próximos passos', 2),
        paragraph(),
      ]
    case 'process':
      return [
        heading('Objetivo', 2),
        paragraph(),
        heading('Quando usar', 2),
        paragraph(),
        heading('Passo a passo', 2),
        paragraph(),
        heading('Responsáveis', 2),
        paragraph(),
      ]
    case 'faq':
      return [
        heading('Perguntas frequentes', 2),
        heading('Pergunta 1', 3),
        paragraph('Resposta.'),
        heading('Pergunta 2', 3),
        paragraph('Resposta.'),
      ]
    case 'release-note':
      return [
        heading('Resumo da release', 2),
        paragraph(),
        heading('Novidades', 2),
        paragraph(),
        heading('Correções', 2),
        paragraph(),
        heading('Impactos', 2),
        paragraph(),
      ]
    default:
      return []
  }
}

async function createPageRevision(pageId: string, userId: string) {
  const [page] = await db
    .select({
      title: pagesTable.title,
      content: pagesTable.content,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) return

  await db.insert(pageRevisionsTable).values({
    pageId,
    title: page.title,
    content: (page.content ?? []) as Record<string, unknown>[],
    contentText: page.contentText,
    createdBy: userId,
  })
}

async function updateDescendantDepths(pageId: string, baseDepth: number) {
  const allPages = await db
    .select({ id: pagesTable.id, parentId: pagesTable.parentId, depth: pagesTable.depth })
    .from(pagesTable)

  const childrenByParent = new Map<string, { id: string; parentId: string | null; depth: number }[]>()
  for (const page of allPages) {
    if (!page.parentId) continue
    const children = childrenByParent.get(page.parentId) ?? []
    children.push(page)
    childrenByParent.set(page.parentId, children)
  }

  async function walk(parentId: string, parentDepth: number) {
    const children = childrenByParent.get(parentId) ?? []
    await Promise.all(
      children.map(async (child) => {
        const depth = parentDepth + 1
        await db.update(pagesTable).set({ depth }).where(eq(pagesTable.id, child.id))
        await walk(child.id, depth)
      }),
    )
  }

  await walk(pageId, baseDepth)
}

type VisibilityNode = {
  id: string
  parentId: string | null
  slug: string
  isExplicitlyPrivate: boolean
}

async function getWorkspaceVisibilityNodes(workspaceId: string) {
  return db
    .select({
      id: pagesTable.id,
      parentId: pagesTable.parentId,
      slug: pagesTable.slug,
      isExplicitlyPrivate: pagesTable.isExplicitlyPrivate,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )
}

function collectSubtree(nodes: VisibilityNode[], rootId: string) {
  const childrenByParent = new Map<string, VisibilityNode[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    const children = childrenByParent.get(node.parentId) ?? []
    children.push(node)
    childrenByParent.set(node.parentId, children)
  }

  const result: VisibilityNode[] = []
  function walk(id: string) {
    for (const child of childrenByParent.get(id) ?? []) {
      result.push(child)
      walk(child.id)
    }
  }

  const root = nodes.find((node) => node.id === rootId)
  if (root) result.push(root)
  walk(rootId)
  return result
}

function collectInheritedPublicSubtree(nodes: VisibilityNode[], rootId: string) {
  const childrenByParent = new Map<string, VisibilityNode[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    const children = childrenByParent.get(node.parentId) ?? []
    children.push(node)
    childrenByParent.set(node.parentId, children)
  }

  const result: VisibilityNode[] = []
  const root = nodes.find((node) => node.id === rootId)
  if (root) result.push(root)

  function walk(id: string) {
    for (const child of childrenByParent.get(id) ?? []) {
      if (child.isExplicitlyPrivate) continue
      result.push(child)
      walk(child.id)
    }
  }

  walk(rootId)
  return result
}

function invalidatePublicVisibility(workspaceId: string, slugs: string[]) {
  for (const slug of slugs) {
    updateTag(`page-${slug}`)
    updateTag(`page-meta-${slug}`)
  }
  updateTag(`workspace-${workspaceId}-tree`)
  updateTag(`workspace-${workspaceId}-public-tree`)
  updateTag(`workspace-${workspaceId}-public-pages`)
  updateTag('public-pages')
  updateTag('public-tree')
}

async function assertPublicPageReferences(
  workspaceId: string,
  blocks: Record<string, unknown>[],
  allowedPublishingSlugs = new Set<string>(),
) {
  const linkedSlugs = extractWikiLinkSlugsFromBlocks(blocks)
  if (linkedSlugs.length === 0) return

  const linkedPages = await db
    .select({
      title: pagesTable.title,
      slug: pagesTable.slug,
      isPublic: pagesTable.isPublic,
      isArchived: pagesTable.isArchived,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        inArray(pagesTable.slug, linkedSlugs),
      ),
    )

  const privateLinks = linkedPages.filter(
    (page) =>
      !page.isArchived &&
      !page.isPublic &&
      !allowedPublishingSlugs.has(page.slug),
  )

  if (privateLinks.length > 0) {
    throw new Error(
      `Página pública só pode referenciar páginas públicas: ${privateLinks
        .map((page) => page.title)
        .join(', ')}`,
    )
  }
}

// ── Page CRUD ──────────────────────────────────────────────────────────────

export async function createPage(
  workspaceId: string,
  parentId: string | null = null,
  title = 'Untitled',
  template: PageTemplate = 'blank',
) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const member = await getWorkspaceMember(workspaceId, session.user.id)
  if (!member || member.role === 'viewer') throw new Error('Forbidden')

  const id = crypto.randomUUID()
  const slug = slugFromTitle(title, id)
  const position = await getNextPosition(workspaceId, parentId)
  const content = templateBlocks(template)
  const contentText = extractTextFromBlocks(content)

  let depth = 0
  let inheritsPublic = false
  if (parentId) {
    const [parent] = await db
      .select({ depth: pagesTable.depth, isPublic: pagesTable.isPublic })
      .from(pagesTable)
      .where(eq(pagesTable.id, parentId))
      .limit(1)
    depth = (parent?.depth ?? 0) + 1
    inheritsPublic = parent?.isPublic ?? false
  }

  const [page] = await db
    .insert(pagesTable)
    .values({
      workspaceId,
      parentId,
      title,
      slug,
      createdBy: session.user.id,
      depth,
      position,
      content,
      contentText,
      isPublic: inheritsPublic,
      publishedAt: inheritsPublic ? new Date() : null,
    })
    .returning()

  updateTag(`workspace-${workspaceId}-tree`)
  if (inheritsPublic) {
    invalidatePublicVisibility(workspaceId, [page.slug])
  }

  return page
}

export async function updatePageContent(
  pageId: string,
  content: Record<string, unknown>[],
  contentText: string,
) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [currentPage] = await db
    .select({
      workspaceId: pagesTable.workspaceId,
      isPublic: pagesTable.isPublic,
    })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!currentPage) throw new Error('Page not found')
  if (currentPage.isPublic) {
    await assertPublicPageReferences(currentPage.workspaceId, content)
  }

  await createPageRevision(pageId, session.user.id)

  await db
    .update(pagesTable)
    .set({
      content,
      contentText,
      lastEditedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(pagesTable.id, pageId))

  const [page] = await db
    .select({ slug: pagesTable.slug, workspaceId: pagesTable.workspaceId, isPublic: pagesTable.isPublic })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (page) {
    updateTag(`page-${page.slug}`)
    updateTag(`page-meta-${page.slug}`)
    if (page.isPublic) {
      updateTag(`workspace-${page.workspaceId}-public-pages`)
      updateTag('public-pages')
    }
  }
}

export async function updatePageTitle(pageId: string, title: string) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({ slug: pagesTable.slug, workspaceId: pagesTable.workspaceId, isPublic: pagesTable.isPublic })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')

  // Regenerate slug from new title; suffix is stable (first 6 chars of pageId)
  const newSlug = slugFromTitle(title, pageId)

  await createPageRevision(pageId, session.user.id)

  await db.transaction(async (tx) => {
    if (page.slug !== newSlug) {
      await tx
        .insert(pageSlugAliasesTable)
        .values({
          pageId,
          workspaceId: page.workspaceId,
          oldSlug: page.slug,
        })
        .onConflictDoNothing()
    }

    await tx
      .update(pagesTable)
      .set({ title, slug: newSlug, updatedAt: new Date() })
      .where(eq(pagesTable.id, pageId))
  })

  // Invalidate both old and new slug cache tags
  updateTag(`page-${page.slug}`)
  updateTag(`page-${newSlug}`)
  updateTag(`page-meta-${page.slug}`)
  updateTag(`page-meta-${newSlug}`)
  updateTag(`workspace-${page.workspaceId}-tree`)
  if (page.isPublic) {
    updateTag(`workspace-${page.workspaceId}-public-tree`)
    updateTag(`workspace-${page.workspaceId}-public-pages`)
    updateTag('public-tree')
    updateTag('public-pages')
  }

  return { newSlug }
}

export async function updatePageIcon(pageId: string, icon: string) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, slug: pagesTable.slug, isPublic: pagesTable.isPublic })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')

  await db
    .update(pagesTable)
    .set({ icon, updatedAt: new Date() })
    .where(eq(pagesTable.id, pageId))

  updateTag(`workspace-${page.workspaceId}-tree`)
  if (page.isPublic) {
    invalidatePublicVisibility(page.workspaceId, [page.slug])
  }
}

export async function deletePage(pageId: string) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, slug: pagesTable.slug })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) return

  await db
    .update(pagesTable)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(pagesTable.id, pageId))

  updateTag(`workspace-${page.workspaceId}-tree`)
  revalidateTag(`page-${page.slug}`, 'max')

  redirect('/wiki')
}

export async function movePage(
  pageId: string,
  newParentId: string | null,
  newPosition: number,
) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({
      workspaceId: pagesTable.workspaceId,
      depth: pagesTable.depth,
      parentId: pagesTable.parentId,
      isExplicitlyPrivate: pagesTable.isExplicitlyPrivate,
    })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')
  if (newParentId === pageId) throw new Error('Cannot move a page into itself')

  if (newParentId) {
    let currentParentId: string | null = newParentId
    while (currentParentId) {
      if (currentParentId === pageId) throw new Error('Cannot move a page into its own subtree')
      const [current] = await db
        .select({ parentId: pagesTable.parentId })
        .from(pagesTable)
        .where(eq(pagesTable.id, currentParentId))
        .limit(1)
      currentParentId = current?.parentId ?? null
    }
  }

  let newDepth = 0
  let newParentIsPublic = false
  if (newParentId) {
    const [parent] = await db
      .select({ depth: pagesTable.depth, isPublic: pagesTable.isPublic })
      .from(pagesTable)
      .where(eq(pagesTable.id, newParentId))
      .limit(1)
    newDepth = (parent?.depth ?? 0) + 1
    newParentIsPublic = parent?.isPublic ?? false
  }

  await db
    .update(pagesTable)
    .set({ parentId: newParentId, position: newPosition, depth: newDepth, updatedAt: new Date() })
    .where(eq(pagesTable.id, pageId))

  await updateDescendantDepths(pageId, newDepth)

  if (newParentIsPublic && !page.isExplicitlyPrivate) {
    const nodes = await getWorkspaceVisibilityNodes(page.workspaceId)
    const inherited = collectInheritedPublicSubtree(nodes, pageId)
    if (inherited.length > 0) {
      await db
        .update(pagesTable)
        .set({ isPublic: true, publishedAt: new Date(), updatedAt: new Date() })
        .where(inArray(pagesTable.id, inherited.map((node) => node.id)))
      invalidatePublicVisibility(page.workspaceId, inherited.map((node) => node.slug))
    }
  }

  updateTag(`workspace-${page.workspaceId}-tree`)
}

export async function togglePageVisibility(pageId: string, isPublic: boolean) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, slug: pagesTable.slug })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')

  const nodes = await getWorkspaceVisibilityNodes(page.workspaceId)
  const affected = isPublic
    ? collectInheritedPublicSubtree(nodes, pageId)
    : collectSubtree(nodes, pageId)

  if (affected.length === 0) return

  if (isPublic) {
    const allowedPublishingSlugs = new Set(affected.map((node) => node.slug))
    const affectedPages = await db
      .select({
        content: pagesTable.content,
      })
      .from(pagesTable)
      .where(inArray(pagesTable.id, affected.map((node) => node.id)))

    for (const affectedPage of affectedPages) {
      await assertPublicPageReferences(
        page.workspaceId,
        (affectedPage.content ?? []) as Record<string, unknown>[],
        allowedPublishingSlugs,
      )
    }

    await db
      .update(pagesTable)
      .set({
        isPublic: true,
        isExplicitlyPrivate: false,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(pagesTable.id, affected.map((node) => node.id)))
  } else {
    const [root, ...descendants] = affected
    await db
      .update(pagesTable)
      .set({
        isPublic: false,
        isExplicitlyPrivate: true,
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(pagesTable.id, root.id))

    if (descendants.length > 0) {
      await db
        .update(pagesTable)
        .set({
          isPublic: false,
          publishedAt: null,
          updatedAt: new Date(),
        })
        .where(inArray(pagesTable.id, descendants.map((node) => node.id)))
    }
  }

  invalidatePublicVisibility(page.workspaceId, affected.map((node) => node.slug))
}

export async function duplicatePage(pageId: string) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [source] = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!source) throw new Error('Page not found')

  const newId = crypto.randomUUID()
  const position = await getNextPosition(source.workspaceId, source.parentId)

  const [copy] = await db
    .insert(pagesTable)
    .values({
      ...source,
      id: newId,
      title: `${source.title} (cópia)`,
      slug: slugFromTitle(`${source.title} copy`, newId),
      isPublic: false,
      isExplicitlyPrivate: false,
      publishedAt: null,
      createdBy: session.user.id,
      lastEditedBy: null,
      position,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  updateTag(`workspace-${source.workspaceId}-tree`)

  return copy
}

export async function restoreArchivedPage(pageId: string) {
  const session = await getSession()
  if (!session || !(await canEditPage(pageId, session)))
    throw new Error('Forbidden')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, slug: pagesTable.slug })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')

  await db
    .update(pagesTable)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(pagesTable.id, pageId))

  updateTag(`workspace-${page.workspaceId}-tree`)
  updateTag(`page-${page.slug}`)
}

export async function permanentlyDeletePage(pageId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, slug: pagesTable.slug })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page || !(await isWorkspaceAdmin(page.workspaceId, session))) {
    throw new Error('Forbidden')
  }

  await db.delete(pagesTable).where(eq(pagesTable.id, pageId))
  updateTag(`workspace-${page.workspaceId}-tree`)
  revalidateTag(`page-${page.slug}`, 'max')
}

export async function toggleFavoritePage(pageId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page) throw new Error('Page not found')
  const member = await getWorkspaceMember(page.workspaceId, session.user.id)
  if (!member) throw new Error('Forbidden')

  const [favorite] = await db
    .select({ id: userPageFavoritesTable.id })
    .from(userPageFavoritesTable)
    .where(
      and(
        eq(userPageFavoritesTable.pageId, pageId),
        eq(userPageFavoritesTable.userId, session.user.id),
      ),
    )
    .limit(1)

  if (favorite) {
    await db
      .delete(userPageFavoritesTable)
      .where(eq(userPageFavoritesTable.id, favorite.id))
    return false
  }

  await db
    .insert(userPageFavoritesTable)
    .values({ pageId, userId: session.user.id })
    .onConflictDoNothing()

  return true
}

export async function recordPageView(pageId: string) {
  const session = await getSession()
  if (!session) return

  const [page] = await db
    .select({ workspaceId: pagesTable.workspaceId, isArchived: pagesTable.isArchived })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageId))
    .limit(1)

  if (!page || page.isArchived) return
  const member = await getWorkspaceMember(page.workspaceId, session.user.id)
  if (!member) return

  await db.insert(pageViewsTable).values({
    pageId,
    workspaceId: page.workspaceId,
    userId: session.user.id,
  })
}

export async function restorePageRevision(revisionId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const [revision] = await db
    .select()
    .from(pageRevisionsTable)
    .where(eq(pageRevisionsTable.id, revisionId))
    .limit(1)

  if (!revision || !(await canEditPage(revision.pageId, session))) {
    throw new Error('Forbidden')
  }

  await createPageRevision(revision.pageId, session.user.id)

  const [page] = await db
    .update(pagesTable)
    .set({
      title: revision.title,
      content: (revision.content ?? []) as Record<string, unknown>[],
      contentText: revision.contentText,
      lastEditedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(pagesTable.id, revision.pageId))
    .returning({ slug: pagesTable.slug, workspaceId: pagesTable.workspaceId })

  if (page) {
    updateTag(`page-${page.slug}`)
    updateTag(`page-meta-${page.slug}`)
    updateTag(`workspace-${page.workspaceId}-tree`)
  }
}

// ── Workspace ────────────────────────────────────────────────────────────

export async function createWorkspace(name: string, slug: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const [workspace] = await db
    .insert(workspacesTable)
    .values({ name, slug, createdBy: session.user.id })
    .returning()

  await db.insert(workspaceMembersTable).values({
    workspaceId: workspace.id,
    userId: session.user.id,
    role: 'owner',
  })

  return workspace
}

export async function setCurrentWorkspace(workspaceId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const member = await getWorkspaceMember(workspaceId, session.user.id)
  if (!member) throw new Error('Forbidden')

  const cookieStore = await cookies()
  cookieStore.set('current-workspace-id', workspaceId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
  })
}

export async function inviteMember(
  workspaceId: string,
  email: string,
  role: string,
) {
  const session = await getSession()
  if (!session || !(await isWorkspaceAdmin(workspaceId, session)))
    throw new Error('Forbidden')

  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(workspaceInvitationsTable).values({
    workspaceId,
    email,
    role,
    token,
    expiresAt,
    invitedBy: session.user.id,
  })

  return token
}

export async function reorderPages(pageIds: string[]) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (pageIds.length === 0) return

  const [first] = await db
    .select({ workspaceId: pagesTable.workspaceId })
    .from(pagesTable)
    .where(eq(pagesTable.id, pageIds[0]))
    .limit(1)
  if (!first) return

  const member = await getWorkspaceMember(first.workspaceId, session.user.id)
  if (!member || member.role === 'viewer') throw new Error('Forbidden')

  await Promise.all(
    pageIds.map((id, i) =>
      db
        .update(pagesTable)
        .set({ position: i })
        .where(and(eq(pagesTable.id, id), eq(pagesTable.workspaceId, first.workspaceId))),
    ),
  )

  updateTag(`workspace-${first.workspaceId}-tree`)
}

export async function acceptInvitation(token: string) {
  const session = await getSession()
  if (!session) redirect(`/login?callbackUrl=/invite/${token}`)

  const [invitation] = await db
    .select()
    .from(workspaceInvitationsTable)
    .where(eq(workspaceInvitationsTable.token, token))
    .limit(1)

  if (!invitation) throw new Error('Convite inválido ou expirado')
  if (invitation.expiresAt < new Date()) throw new Error('Convite expirado')

  const existing = await getWorkspaceMember(invitation.workspaceId, session.user.id)
  if (!existing) {
    await db.insert(workspaceMembersTable).values({
      workspaceId: invitation.workspaceId,
      userId: session.user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    })
  }

  await db
    .delete(workspaceInvitationsTable)
    .where(eq(workspaceInvitationsTable.id, invitation.id))

  redirect('/wiki')
}
