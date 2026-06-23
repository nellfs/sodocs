import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/server'
import { canViewPage } from '@/lib/wiki/access'
import { getStorageBackend } from '@/lib/storage'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ pageId: string; fileName: string }> },
) {
  const { pageId, fileName } = await context.params
  const session = await getSession()

  if (!(await canViewPage(pageId, session))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const storage = getStorageBackend()
  const result = await storage.get(pageId, fileName)

  if (!result) {
    return Response.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(result.buffer.length),
      'Content-Type': result.contentType,
    },
  })
}
