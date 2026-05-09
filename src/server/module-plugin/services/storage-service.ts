export interface StorageProvider {
  upload(key: string, data: Buffer | ArrayBuffer): Promise<string>
  download(key: string): Promise<Buffer>
  getUrl(key: string): string
  delete(key: string): Promise<void>
}

import {
  parseNpmKey,
  buildNpmTarballUrl,
  validateNpmPackage,
  parsePackageUrl,
  type NpmPackageInfo,
  type StorageType,
} from '../../utils/npm'

export type { NpmPackageInfo, StorageType }
export { validateNpmPackage, parsePackageUrl }

function pluginR2Key(slug: string, version: string): string {
  return `plugins/${slug}/${version}.tar.gz`
}

export class R2Storage implements StorageProvider {
  private bucket: R2Bucket

  constructor(bucket: R2Bucket) {
    this.bucket = bucket
  }

  async upload(key: string, data: Buffer | ArrayBuffer): Promise<string> {
    await this.bucket.put(key, data)
    return `r2://${key}`
  }

  async download(key: string): Promise<Buffer> {
    const object = await this.bucket.get(key)
    if (!object) throw new Error(`R2 object not found: ${key}`)
    const arrayBuf = await object.arrayBuffer()
    return Buffer.from(arrayBuf)
  }

  getUrl(key: string): string {
    return `r2://${key}`
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key)
  }

  static uploadPluginTarball(
    bucket: R2Bucket,
    slug: string,
    version: string,
    data: Buffer | ArrayBuffer
  ): Promise<string> {
    const storage = new R2Storage(bucket)
    return storage.upload(pluginR2Key(slug, version), data)
  }

  static getPluginKey(slug: string, version: string): string {
    return pluginR2Key(slug, version)
  }
}

export class NpmMirrorStorage implements StorageProvider {
  upload(_key: string, _data: Buffer | ArrayBuffer): Promise<string> {
    throw new Error('NpmMirrorStorage does not support direct upload. Publish via npm instead.')
  }

  async download(key: string): Promise<Buffer> {
    const parsed = parseNpmKey(key)
    const tarballUrl = buildNpmTarballUrl(parsed.name, parsed.version)
    const res = await fetch(tarballUrl)
    if (!res.ok) throw new Error(`Failed to download ${parsed.name}@${parsed.version} from npm`)
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  }

  getUrl(key: string): string {
    return key
  }

  async delete(_key: string): Promise<void> {
    throw new Error('Cannot delete npm packages. Unpublish via npm CLI.')
  }

  static buildKey(packageName: string, version: string): string {
    return `npm://${packageName}@${version}`
  }

  static buildTarballUrl(packageName: string, version: string): string {
    return buildNpmTarballUrl(packageName, version)
  }
}

export function resolveDownloadUrl(packageUrl: string): string | null {
  const parsed = parsePackageUrl(packageUrl)
  if (!parsed) return null

  if (parsed.type === 'npm') {
    const { name, version } = parseNpmKey(parsed.key)
    return NpmMirrorStorage.buildTarballUrl(name, version)
  }

  return null
}
