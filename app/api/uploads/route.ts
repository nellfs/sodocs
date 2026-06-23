import path from 'node:path'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/server'
import { canEditPage } from '@/lib/wiki/access'
import { getStorageBackend } from '@/lib/storage'

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024

const BLOCKED_EXTENSIONS = new Set([
  'bat',
  'cmd',
  'com',
  'csh',
  'dmg',
  'dll',
  'dylib',
  'exe',
  'html',
  'js',
  'jsx',
  'mjs',
  'php',
  'ps1',
  'sh',
  'svg',
  'ts',
  'tsx',
])

function safeFileName(name: string) {
  const ext = path.extname(name).slice(1).toLowerCase()
  const base = path
    .basename(name, path.extname(name))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'arquivo'

  return {
    ext,
    fileName: `${base}-${crypto.randomUUID()}${ext ? `.${ext}` : ''}`,
  }
}

function isAllowedFile(file: File, ext: string) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE) return false
  if (BLOCKED_EXTENSIONS.has(ext)) return false
  if (file.type.startsWith('image/')) return file.type !== 'image/svg+xml'
  if (file.type.startsWith('video/')) return true
  if (file.type.startsWith('audio/')) return true

  return [
    'application/json',
    'application/msword',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'text/csv',
    'text/plain',
  ].includes(file.type)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pageId = request.nextUrl.searchParams.get('pageId')
  if (!pageId || !(await canEditPage(pageId, session))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return Response.json({ error: 'Upload inválido ou interrompido' }, { status: 400 })
  }

  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  const { ext, fileName } = safeFileName(file.name)
  if (!isAllowedFile(file, ext)) {
    return Response.json({ error: 'Tipo ou tamanho de arquivo não permitido' }, { status: 400 })
  }

  const storage = getStorageBackend()
  const bytes = Buffer.from(await file.arrayBuffer())
  const url = await storage.save(pageId, fileName, bytes, file.type)

  return Response.json({
    url,
    name: file.name,
    size: file.size,
    type: file.type,
  })
}
