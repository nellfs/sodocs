import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import db from '@/lib/db'
import {
  pagesTable,
  pageSlugAliasesTable,
  pageViewsTable,
  pageRevisionsTable,
  userPageFavoritesTable,
  usersTable,
  workspaceMembersTable,
  workspacesTable,
} from '@/lib/db/schemas'
import { buildPageTree, getAncestors } from './utils'
import type { PageSummary, PageTreeNode } from './types'

export async function getPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  'use cache'
  cacheLife('seconds')
  cacheTag(`workspace-${workspaceId}-tree`)

  const pages = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      isExplicitlyPrivate: pagesTable.isExplicitlyPrivate,
      publishedAt: pagesTable.publishedAt,
      parentId: pagesTable.parentId,
      position: pagesTable.position,
      depth: pagesTable.depth,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )

  return buildPageTree(pages)
}

export async function getPageBySlug(workspaceId: string, slug: string) {
  const [page] = await db
    .select()
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.slug, slug),
        eq(pagesTable.isArchived, false),
      ),
    )
    .limit(1)

  return page ?? null
}

export async function getSlugAlias(workspaceId: string, oldSlug: string) {
  const [alias] = await db
    .select({
      pageId: pageSlugAliasesTable.pageId,
      currentSlug: pagesTable.slug,
      isPublic: pagesTable.isPublic,
      isArchived: pagesTable.isArchived,
    })
    .from(pageSlugAliasesTable)
    .innerJoin(pagesTable, eq(pageSlugAliasesTable.pageId, pagesTable.id))
    .where(
      and(
        eq(pageSlugAliasesTable.workspaceId, workspaceId),
        eq(pageSlugAliasesTable.oldSlug, oldSlug),
      ),
    )
    .limit(1)

  return alias ?? null
}

export async function getPublicPageBySlug(slug: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(`page-${slug}`)

  const [page] = await db
    .select()
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.slug, slug),
        eq(pagesTable.isPublic, true),
        eq(pagesTable.isArchived, false),
      ),
    )
    .limit(1)

  return page ?? null
}

export async function getPublicSlugAlias(oldSlug: string) {
  const [alias] = await db
    .select({
      currentSlug: pagesTable.slug,
      isPublic: pagesTable.isPublic,
      isArchived: pagesTable.isArchived,
    })
    .from(pageSlugAliasesTable)
    .innerJoin(pagesTable, eq(pageSlugAliasesTable.pageId, pagesTable.id))
    .where(eq(pageSlugAliasesTable.oldSlug, oldSlug))
    .limit(1)

  return alias ?? null
}

export async function getPageMetadata(slug: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag(`page-meta-${slug}`)

  const [page] = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      contentText: pagesTable.contentText,
      isPublic: pagesTable.isPublic,
    })
    .from(pagesTable)
    .where(eq(pagesTable.slug, slug))
    .limit(1)

  return page ?? null
}

export async function getAllPagesFlat(workspaceId: string) {
  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      isExplicitlyPrivate: pagesTable.isExplicitlyPrivate,
      publishedAt: pagesTable.publishedAt,
      parentId: pagesTable.parentId,
      position: pagesTable.position,
      depth: pagesTable.depth,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )
}

export async function getBreadcrumbs(workspaceId: string, pageId: string) {
  const pages = await getAllPagesFlat(workspaceId)
  return getAncestors(pages, pageId)
}

export async function getUserWorkspaces(userId: string) {
  return db
    .select({
      id: workspacesTable.id,
      name: workspacesTable.name,
      slug: workspacesTable.slug,
      logoUrl: workspacesTable.logoUrl,
      role: workspaceMembersTable.role,
    })
    .from(workspaceMembersTable)
    .innerJoin(
      workspacesTable,
      eq(workspaceMembersTable.workspaceId, workspacesTable.id),
    )
    .where(eq(workspaceMembersTable.userId, userId))
}

export async function getWorkspaceBySlug(slug: string) {
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.slug, slug))
    .limit(1)

  return workspace ?? null
}

export async function getWorkspaceMember(workspaceId: string, userId: string) {
  const [member] = await db
    .select()
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, userId),
      ),
    )
    .limit(1)

  return member ?? null
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      id: workspaceMembersTable.id,
      workspaceId: workspaceMembersTable.workspaceId,
      userId: workspaceMembersTable.userId,
      role: workspaceMembersTable.role,
      invitedBy: workspaceMembersTable.invitedBy,
      joinedAt: workspaceMembersTable.joinedAt,
      userName: usersTable.name,
      userEmail: usersTable.email,
      userImage: usersTable.image,
    })
    .from(workspaceMembersTable)
    .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
    .where(eq(workspaceMembersTable.workspaceId, workspaceId))
}

export async function getWikiDashboard(workspaceId: string, userId: string) {
  const [stats] = await db
    .select({
      totalPages: sql<number>`count(*)::int`,
      publicPages: sql<number>`count(*) filter (where ${pagesTable.isPublic})::int`,
      emptyPages: sql<number>`count(*) filter (where coalesce(${pagesTable.contentText}, '') = '')::int`,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )

  const [recentlyUpdated, favorites, recentViews, emptyPages, publicPages] =
    await Promise.all([
      getWorkspacePageSummaries(workspaceId, { limit: 6, order: 'updated' }),
      getFavoritePages(workspaceId, userId, 6),
      getRecentPages(workspaceId, userId, 6),
      getEmptyPages(workspaceId, 6),
      getPublicPages(workspaceId, 6),
    ])

  return {
    stats: stats ?? { totalPages: 0, publicPages: 0, emptyPages: 0 },
    recentlyUpdated,
    favorites,
    recentViews,
    emptyPages,
    publicPages,
  }
}

export async function getWorkspacePageSummaries(
  workspaceId: string,
  options: { limit?: number; order?: 'updated' | 'title' } = {},
): Promise<PageSummary[]> {
  const orderBy =
    options.order === 'title' ? pagesTable.title : desc(pagesTable.updatedAt)

  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )
    .orderBy(orderBy)
    .limit(options.limit ?? 20)
}

export async function getPublicPages(workspaceId?: string, limit = 20) {
  'use cache'
  cacheLife('minutes')
  cacheTag(workspaceId ? `workspace-${workspaceId}-public-pages` : 'public-pages')

  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(
      and(
        workspaceId ? eq(pagesTable.workspaceId, workspaceId) : sql`true`,
        eq(pagesTable.isPublic, true),
        eq(pagesTable.isArchived, false),
      ),
    )
    .orderBy(desc(pagesTable.updatedAt))
    .limit(limit)
}

export async function getPublicPageTree(workspaceId?: string): Promise<PageTreeNode[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag(workspaceId ? `workspace-${workspaceId}-public-tree` : 'public-tree')

  const pages = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      isExplicitlyPrivate: pagesTable.isExplicitlyPrivate,
      publishedAt: pagesTable.publishedAt,
      parentId: pagesTable.parentId,
      position: pagesTable.position,
      depth: pagesTable.depth,
    })
    .from(pagesTable)
    .where(
      and(
        workspaceId ? eq(pagesTable.workspaceId, workspaceId) : sql`true`,
        eq(pagesTable.isPublic, true),
        eq(pagesTable.isArchived, false),
      ),
    )

  return buildPageTree(pages)
}

export async function getFavoritePageIds(userId: string) {
  const rows = await db
    .select({ pageId: userPageFavoritesTable.pageId })
    .from(userPageFavoritesTable)
    .where(eq(userPageFavoritesTable.userId, userId))

  return new Set(rows.map((row) => row.pageId))
}

export async function isFavoritePage(userId: string, pageId: string) {
  const [favorite] = await db
    .select({ id: userPageFavoritesTable.id })
    .from(userPageFavoritesTable)
    .where(
      and(
        eq(userPageFavoritesTable.userId, userId),
        eq(userPageFavoritesTable.pageId, pageId),
      ),
    )
    .limit(1)

  return !!favorite
}

export async function getFavoritePages(
  workspaceId: string,
  userId: string,
  limit = 10,
): Promise<PageSummary[]> {
  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(userPageFavoritesTable)
    .innerJoin(pagesTable, eq(userPageFavoritesTable.pageId, pagesTable.id))
    .where(
      and(
        eq(userPageFavoritesTable.userId, userId),
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )
    .orderBy(desc(userPageFavoritesTable.createdAt))
    .limit(limit)
}

export async function getRecentPages(
  workspaceId: string,
  userId: string,
  limit = 10,
): Promise<PageSummary[]> {
  const recentRows = await db
    .select({
      pageId: pageViewsTable.pageId,
      viewedAt: sql<Date>`max(${pageViewsTable.viewedAt})`,
    })
    .from(pageViewsTable)
    .where(
      and(
        eq(pageViewsTable.userId, userId),
        eq(pageViewsTable.workspaceId, workspaceId),
      ),
    )
    .groupBy(pageViewsTable.pageId)
    .orderBy(desc(sql`max(${pageViewsTable.viewedAt})`))
    .limit(limit)

  if (recentRows.length === 0) return []

  const pageIds = recentRows.map((row) => row.pageId)
  const pages = await db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(
      and(
        inArray(pagesTable.id, pageIds),
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
      ),
    )

  const byId = new Map(pages.map((page) => [page.id, page]))
  return pageIds.map((id) => byId.get(id)).filter((page): page is PageSummary => !!page)
}

export async function getEmptyPages(workspaceId: string, limit = 10): Promise<PageSummary[]> {
  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
        sql`coalesce(${pagesTable.contentText}, '') = ''`,
      ),
    )
    .orderBy(desc(pagesTable.updatedAt))
    .limit(limit)
}

export async function getPageRevisions(pageId: string, limit = 10) {
  return db
    .select({
      id: pageRevisionsTable.id,
      title: pageRevisionsTable.title,
      createdAt: pageRevisionsTable.createdAt,
      createdBy: pageRevisionsTable.createdBy,
      contentText: pageRevisionsTable.contentText,
    })
    .from(pageRevisionsTable)
    .where(eq(pageRevisionsTable.pageId, pageId))
    .orderBy(desc(pageRevisionsTable.createdAt))
    .limit(limit)
}

export async function getPageBacklinks(workspaceId: string, slug: string, pageId: string) {
  return db
    .select({
      id: pagesTable.id,
      title: pagesTable.title,
      slug: pagesTable.slug,
      icon: pagesTable.icon,
      isPublic: pagesTable.isPublic,
      updatedAt: pagesTable.updatedAt,
      contentText: pagesTable.contentText,
    })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
        sql`${pagesTable.id} <> ${pageId}`,
        sql`${pagesTable.content}::text ILIKE ${`%/wiki/${slug}%`}`,
      ),
    )
    .orderBy(desc(pagesTable.updatedAt))
    .limit(10)
}

export async function getNextPosition(
  workspaceId: string,
  parentId: string | null,
): Promise<number> {
  const siblings = await db
    .select({ position: pagesTable.position })
    .from(pagesTable)
    .where(
      and(
        eq(pagesTable.workspaceId, workspaceId),
        parentId ? eq(pagesTable.parentId, parentId) : isNull(pagesTable.parentId),
      ),
    )

  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((s) => s.position)) + 1
}
