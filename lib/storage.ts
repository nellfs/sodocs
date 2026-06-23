import 'server-only'
import { mkdir, readFile, stat, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3'
import { env } from './env'

export interface StorageBackend {
  save(pageId: string, fileName: string, buffer: Buffer, contentType: string): Promise<string>
  get(pageId: string, fileName: string): Promise<{ buffer: Buffer; contentType: string } | null>
  delete(pageId: string, fileName: string): Promise<void>
}

const MIME_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
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

function mimeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase()
  return MIME_BY_EXTENSION[ext] ?? 'application/octet-stream'
}

// --- Local backend ---

const UPLOAD_DIR = path.join(process.cwd(), '.uploads')

class LocalStorageBackend implements StorageBackend {
  async save(pageId: string, fileName: string, buffer: Buffer): Promise<string> {
    const dir = path.join(UPLOAD_DIR, pageId)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, fileName), buffer)
    return `/api/uploads/${pageId}/${fileName}`
  }

  async get(pageId: string, fileName: string) {
    const safe = path.basename(fileName)
    const filePath = path.join(UPLOAD_DIR, pageId, safe)
    if (!filePath.startsWith(path.join(UPLOAD_DIR, pageId))) return null
    try {
      const [file] = await Promise.all([readFile(filePath), stat(filePath)])
      return { buffer: file, contentType: mimeFromFileName(safe) }
    } catch {
      return null
    }
  }

  async delete(pageId: string, fileName: string) {
    const safe = path.basename(fileName)
    try {
      await unlink(path.join(UPLOAD_DIR, pageId, safe))
    } catch { /* ignore */ }
  }
}

// --- S3 backend ---

class S3StorageBackend implements StorageBackend {
  private client: S3Client
  private bucket: string
  private bucketEnsured = false

  constructor() {
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    })
    this.bucket = env.S3_BUCKET!
  }

  private key(pageId: string, fileName: string) {
    return `uploads/${pageId}/${fileName}`
  }

  private async ensureBucket() {
    if (this.bucketEnsured) return
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name
      if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') throw err
    }
    this.bucketEnsured = true
  }

  async save(pageId: string, fileName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.ensureBucket()
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(pageId, fileName),
        Body: buffer,
        ContentType: contentType,
      }),
    )
    return `/api/uploads/${pageId}/${fileName}`
  }

  async get(pageId: string, fileName: string) {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.key(pageId, fileName),
        }),
      )
      const buffer = Buffer.from(await response.Body!.transformToByteArray())
      const contentType = response.ContentType ?? mimeFromFileName(fileName)
      return { buffer, contentType }
    } catch {
      return null
    }
  }

  async delete(pageId: string, fileName: string) {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: this.key(pageId, fileName),
        }),
      )
    } catch { /* ignore */ }
  }
}

// --- Backend resolution ---

let s3Backend: S3StorageBackend | null = null
const localBackend = new LocalStorageBackend()

export function getStorageBackend(): StorageBackend {
  if (env.UPLOAD_STORAGE === 's3') {
    if (!s3Backend) s3Backend = new S3StorageBackend()
    return s3Backend
  }
  return localBackend
}
