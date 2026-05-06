import { mkdir, writeFile, unlink, stat, readdir, rm, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { isCloudflare } from './env'
import { getConfig } from '../config'

export interface FileUploadConfig {
  uploadDir: string
  maxFileSize: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

export interface UploadedFile {
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  extension: string
}

export interface FileStorageConfig {
  baseDir: string
  tempDir: string
  tempFileTTL: number
  privateUrlExpiry: number
  secretKey: string
}

export interface FileAccessOptions {
  isPrivate?: boolean
  expirySeconds?: number
}

const DEFAULT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const DEFAULT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.csv',
  '.json',
  '.xlsx',
  '.docx',
]

let storageConfig: FileStorageConfig | null = null

export function getFileStorageConfig(): FileStorageConfig {
  if (storageConfig) return storageConfig

  const appConfig = getConfig()

  const baseDir = appConfig.fileStorage.storagePath
  const tempDir = appConfig.fileStorage.tempPath
  const tempFileTTL = appConfig.fileStorage.tempFileTTL
  const privateUrlExpiry = appConfig.fileStorage.privateUrlExpiry
  const secretKey = appConfig.fileStorage.secretKey
  if (!secretKey) throw new Error('FILE_SECRET_KEY environment variable is required in production')

  storageConfig = {
    baseDir,
    tempDir,
    tempFileTTL,
    privateUrlExpiry,
    secretKey,
  }

  return storageConfig
}

export function getUploadConfig(
  namespace: string,
  overrides?: Partial<FileUploadConfig>
): FileUploadConfig {
  const config = getFileStorageConfig()

  return {
    uploadDir: join(config.baseDir, namespace),
    maxFileSize: overrides?.maxFileSize ?? 10 * 1024 * 1024,
    allowedMimeTypes: overrides?.allowedMimeTypes ?? DEFAULT_MIME_TYPES,
    allowedExtensions: overrides?.allowedExtensions ?? DEFAULT_EXTENSIONS,
  }
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export function validateFile(
  file: { name: string; type: string; size: number },
  config: FileUploadConfig
): { valid: boolean; error?: string } {
  if (file.size > config.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${config.maxFileSize} bytes`,
    }
  }

  if (!config.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed`,
    }
  }

  const ext = extname(file.name).toLowerCase()
  if (!config.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension "${ext}" is not allowed`,
    }
  }

  return { valid: true }
}

export async function saveFile(
  namespace: string,
  file: { name: string; type: string; size: number; data: ArrayBuffer },
  configOverrides?: Partial<FileUploadConfig>
): Promise<UploadedFile> {
  if (isCloudflare) {
    throw new Error(
      'Local file storage is not supported in Cloudflare environment. Use R2 or other cloud storage.'
    )
  }

  const config = getUploadConfig(namespace, configOverrides)

  const validation = validateFile(file, config)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  await ensureDir(config.uploadDir)

  const ext = extname(file.name).toLowerCase()
  const filename = `${randomUUID()}${ext}`
  const filePath = join(config.uploadDir, filename)

  await writeFile(filePath, Buffer.from(file.data))

  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    extension: ext,
  }
}

export async function saveToTemp(
  file: { name: string; type: string; size: number; data: ArrayBuffer },
  configOverrides?: Partial<FileUploadConfig>
): Promise<UploadedFile> {
  if (isCloudflare) {
    throw new Error(
      'Local file storage is not supported in Cloudflare environment. Use R2 or other cloud storage.'
    )
  }

  const config = getFileStorageConfig()
  const uploadConfig = getUploadConfig('temp', configOverrides)

  const validation = validateFile(file, uploadConfig)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  await ensureDir(config.tempDir)

  const ext = extname(file.name).toLowerCase()
  const filename = `${randomUUID()}${ext}`
  const filePath = join(config.tempDir, filename)

  await writeFile(filePath, Buffer.from(file.data))

  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    extension: ext,
  }
}

export async function readFileData(filePath: string): Promise<Buffer> {
  if (isCloudflare) {
    throw new Error('Local file storage is not supported in Cloudflare environment.')
  }

  if (!existsSync(filePath)) {
    throw new Error('File not found')
  }

  return readFile(filePath)
}

export async function getFileStream(filePath: string): Promise<ReadableStream> {
  if (isCloudflare) {
    throw new Error('Local file storage is not supported in Cloudflare environment.')
  }

  if (!existsSync(filePath)) {
    throw new Error('File not found')
  }

  const file = await readFile(filePath)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(file)
      controller.close()
    },
  })
}

export async function deleteFile(filePath: string): Promise<boolean> {
  if (isCloudflare) {
    throw new Error('Local file storage is not supported in Cloudflare environment.')
  }

  try {
    if (existsSync(filePath)) {
      await unlink(filePath)
    }
    return true
  } catch {
    return false
  }
}

export async function moveFile(sourcePath: string, namespace: string): Promise<string> {
  if (isCloudflare) {
    throw new Error('Local file storage is not supported in Cloudflare environment.')
  }

  const config = getUploadConfig(namespace)
  await ensureDir(config.uploadDir)

  const filename = sourcePath.split('/').pop() || randomUUID()
  const destPath = join(config.uploadDir, filename)

  const { rename } = await import('fs/promises')
  await rename(sourcePath, destPath)

  return destPath
}

export async function cleanupTempFiles(): Promise<{ deleted: number; errors: number }> {
  if (isCloudflare) {
    return { deleted: 0, errors: 0 }
  }

  const config = getFileStorageConfig()
  let deleted = 0
  let errors = 0

  if (!existsSync(config.tempDir)) {
    return { deleted, errors }
  }

  const files = await readdir(config.tempDir)
  const now = Date.now()

  for (const file of files) {
    const filePath = join(config.tempDir, file)
    try {
      const fileStat = await stat(filePath)
      const fileAge = now - fileStat.mtimeMs

      if (fileAge > config.tempFileTTL) {
        await unlink(filePath)
        deleted++
      }
    } catch {
      errors++
    }
  }

  return { deleted, errors }
}

export async function clearNamespace(
  namespace: string
): Promise<{ deleted: number; errors: number }> {
  if (isCloudflare) {
    return { deleted: 0, errors: 0 }
  }

  const config = getUploadConfig(namespace)
  let deleted = 0
  let errors = 0

  if (!existsSync(config.uploadDir)) {
    return { deleted, errors }
  }

  try {
    await rm(config.uploadDir, { recursive: true })
    deleted = 1
  } catch {
    errors = 1
  }

  return { deleted, errors }
}

export function getFilePath(namespace: string, filename: string): string {
  const config = getFileStorageConfig()
  return join(config.baseDir, namespace, filename)
}

export function getPublicFileUrl(namespace: string, filename: string, baseUrl?: string): string {
  if (baseUrl) {
    return `${baseUrl}/files/public/${namespace}/${filename}`
  }
  return `/files/public/${namespace}/${filename}`
}

export function getPublicFilePath(namespace: string, filename: string): string {
  return `/files/public/${namespace}/${filename}`
}

export async function fileExists(namespace: string, filename: string): Promise<boolean> {
  const filePath = getFilePath(namespace, filename)
  return existsSync(filePath)
}

export async function getFileInfo(
  namespace: string,
  filename: string
): Promise<{ size: number; mimeType: string; lastModified: Date } | null> {
  const filePath = getFilePath(namespace, filename)

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const stats = await stat(filePath)
    const ext = extname(filename).toLowerCase()

    const mimeTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    return {
      size: stats.size,
      mimeType: mimeTypeMap[ext] || 'application/octet-stream',
      lastModified: stats.mtime,
    }
  } catch {
    return null
  }
}
