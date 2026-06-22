import { and, eq, sql } from 'drizzle-orm'
import db from '@/lib/db'
import { pagesTable } from '@/lib/db/schemas'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim() ?? ''

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
          'MaxWords=18, MinWords=5, StartSel=<mark>, StopSel=</mark>'
        )`,
      })
      .from(pagesTable)
      .where(
        and(
          eq(pagesTable.isPublic, true),
          eq(pagesTable.isArchived, false),
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
          eq(pagesTable.isPublic, true),
          eq(pagesTable.isArchived, false),
          sql`(${pagesTable.title} ILIKE ${`%${query}%`} OR ${pagesTable.contentText} ILIKE ${`%${query}%`})`,
        ),
      )
      .limit(20)

    return Response.json({
      results: results.map((result) => ({
        ...result,
        excerpt: result.excerpt?.slice(0, 160) ?? '',
      })),
    })
  }
}
