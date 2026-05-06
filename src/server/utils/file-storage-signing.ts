import { createHmac, timingSafeEqual } from 'crypto'
import { getFileStorageConfig } from './file-storage-core'
import type { FileAccessOptions } from './file-storage-core'

export interface SignedUrlParams {
  namespace: string
  filename: string
  expiry: number
  signature: string
}

export function generateSignature(namespace: string, filename: string, expiry: number): string {
  const config = getFileStorageConfig()
  const data = `${namespace}:${filename}:${expiry}`
  return createHmac('sha256', config.secretKey).update(data).digest('hex')
}

export function verifySignature(
  namespace: string,
  filename: string,
  expiry: number,
  signature: string
): boolean {
  const expectedSignature = generateSignature(namespace, filename, expiry)
  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

export function getPrivateFileUrl(
  namespace: string,
  filename: string,
  expirySeconds?: number,
  baseUrl?: string
): { url: string; expiry: number } {
  const config = getFileStorageConfig()
  const expiry = Math.floor(Date.now() / 1000) + (expirySeconds || config.privateUrlExpiry)
  const signature = generateSignature(namespace, filename, expiry)

  const url = baseUrl
    ? `${baseUrl}/files/private/${namespace}/${filename}?expiry=${expiry}&signature=${signature}`
    : `/files/private/${namespace}/${filename}?expiry=${expiry}&signature=${signature}`

  return { url, expiry }
}

export function parseSignedUrl(path: string): SignedUrlParams | null {
  const match = path.match(/\/files\/private\/([^/]+)\/(.+)$/)
  if (!match) return null

  return {
    namespace: match[1],
    filename: match[2],
    expiry: 0,
    signature: '',
  }
}

export function getFileUrl(
  namespace: string,
  filename: string,
  options?: FileAccessOptions,
  baseUrl?: string
): { url: string; isPrivate: boolean; expiry?: number } {
  if (options?.isPrivate) {
    const { url, expiry } = getPrivateFileUrl(namespace, filename, options.expirySeconds, baseUrl)
    return { url, isPrivate: true, expiry }
  }

  const publicUrl = baseUrl
    ? `${baseUrl}/files/public/${namespace}/${filename}`
    : `/files/public/${namespace}/${filename}`
  return { url: publicUrl, isPrivate: false }
}
