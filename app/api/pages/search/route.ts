import { sql, and, eq } from 'drizzle-orm'
import db from '@/lib/db'
import { pagesTable } from '@/lib/db/schemas'
import { getSession } from '@/lib/auth/server'
import { getUserWorkspaces } from '@/lib/wiki/queries'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim() ?? ''
  const workspaceIdParam = url.searchParams.get('workspaceId')
  const publicOnly = url.searchParams.get('publicOnly') === '1'

  // Resolve workspace (always needed)
  const userWorkspaces = await getUserWorkspaces(session.user.id)
  const cookieStore = await cookies()
  const currentWorkspaceId =
    workspaceIdParam ??
    cookieStore.get('current-workspace-id')?.value ??
    userWorkspaces[0]?.id

  if (!currentWorkspaceId) {
    return Response.json({ results: [] })
  }

  const hasAccess = userWorkspaces.some((w) => w.id === currentWorkspaceId)
  if (!hasAccess) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Empty query → list all pages (used by move dialog / page link picker)
  if (!query) {
    const allPages = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        slug: pagesTable.slug,
        icon: pagesTable.icon,
        excerpt: pagesTable.contentText,
      })
      .from(pagesTable)
      .where(
        and(
          eq(pagesTable.workspaceId, currentWorkspaceId),
          eq(pagesTable.isArchived, false),
          publicOnly ? eq(pagesTable.isPublic, true) : sql`true`,
        ),
      )
      .orderBy(pagesTable.title)
      .limit(100)
    return Response.json({ results: allPages.map((r) => ({ ...r, excerpt: '' })) })
  }

  if (query.length < 2) {
    return Response.json({ results: [] })
  }

  try {
    const results = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        slug: pagesTable.slug,
        icon: pagesTable.icon,
        excerpt: sql<string>`ts_headline(
          'portuguese',
          coalesce(${pagesTable.contentText}, ''),
          plainto_tsquery('portuguese', ${query}),
          'MaxWords=15, MinWords=5, StartSel=<mark>, StopSel=</mark>'
        )`,
      })
      .from(pagesTable)
      .where(
        and(
          eq(pagesTable.workspaceId, currentWorkspaceId),
          eq(pagesTable.isArchived, false),
          publicOnly ? eq(pagesTable.isPublic, true) : sql`true`,
          sql`content_tsv @@ plainto_tsquery('portuguese', ${query})`,
        ),
      )
      .limit(20)

    return Response.json({ results })
  } catch {
    const results = await db
      .select({
        id: pagesTable.id,
        title: pagesTable.title,
        slug: pagesTable.slug,
        icon: pagesTable.icon,
        excerpt: pagesTable.contentText,
      })
      .from(pagesTable)
      .where(
        and(
          eq(pagesTable.workspaceId, currentWorkspaceId),
          eq(pagesTable.isArchived, false),
          publicOnly ? eq(pagesTable.isPublic, true) : sql`true`,
          sql`(${pagesTable.title} ILIKE ${'%' + query + '%'} OR ${pagesTable.contentText} ILIKE ${'%' + query + '%'})`,
        ),
      )
      .limit(20)

    return Response.json({
      results: results.map((r) => ({ ...r, excerpt: r.excerpt?.slice(0, 150) ?? '' })),
    })
  }
}
