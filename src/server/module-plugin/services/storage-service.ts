export interface StorageProvider {
  upload(key: string, data: Buffer | ArrayBuffer): Promise<string>
  download(key: string): Promise<Buffer>
  getUrl(key: string): string
  delete(key: string): Promise<void>
}

export interface NpmPackageInfo {
  name: string
  version: string
  dist: { tarball: string; shasum: string; integrity?: string }
  description?: string
  author?: unknown
  license?: string
}

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

function parseNpmKey(key: string): { name: string; version: string } {
  if (!key.startsWith('npm://')) throw new Error(`Invalid npm key: ${key}`)
  const rest = key.slice(6)
  const atIndex = rest.lastIndexOf('@')
  if (atIndex === -1) throw new Error(`Invalid npm key format, missing version: ${key}`)
  const name = rest.slice(0, atIndex)
  const version = rest.slice(atIndex + 1)
  return { name, version }
}

function buildNpmTarballUrl(packageName: string, version: string): string {
  const encodedName = encodeURIComponent(packageName)
  return `https://registry.npmjs.org/${encodedName}/-/${packageName}-${version}.tgz`
}

export async function validateNpmPackage(
  packageName: string,
  version: string
): Promise<NpmPackageInfo> {
  const encodedName = encodeURIComponent(packageName)
  const res = await fetch(`https://registry.npmjs.org/${encodedName}/${version}`)
  if (!res.ok) {
    throw new Error(
      `Package ${packageName}@${version} not found on npm (HTTP ${res.status})`
    )
  }
  return res.json() as Promise<NpmPackageInfo>
}

export type StorageType = 'npm' | 'r2'

export function parsePackageUrl(
  packageUrl: string
): { type: StorageType; key: string } | null {
  if (packageUrl.startsWith('npm://')) {
    return { type: 'npm', key: packageUrl }
  }
  if (packageUrl.startsWith('r2://')) {
    return { type: 'r2', key: packageUrl }
  }
  return null
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
