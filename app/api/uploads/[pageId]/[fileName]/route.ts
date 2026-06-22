import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/server'
import { canViewPage } from '@/lib/wiki/access'

const UPLOAD_DIR = path.join(process.cwd(), '.uploads')

const MIME_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  json: 'application/json',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ pageId: string; fileName: string }> },
) {
  const { pageId, fileName } = await context.params
  const session = await getSession()

  if (!(await canViewPage(pageId, session))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const safeFileName = path.basename(fileName)
  const filePath = path.join(UPLOAD_DIR, pageId, safeFileName)
  const root = path.join(UPLOAD_DIR, pageId)
  if (!filePath.startsWith(root)) {
    return Response.json({ error: 'Invalid path' }, { status: 400 })
  }

  try {
    const [file, metadata] = await Promise.all([readFile(filePath), stat(filePath)])
    const ext = path.extname(safeFileName).slice(1).toLowerCase()
    const contentType = MIME_BY_EXTENSION[ext] ?? 'application/octet-stream'

    return new Response(file, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'Content-Length': String(metadata.size),
        'Content-Type': contentType,
      },
    })
  } catch {
    return Response.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }
}
