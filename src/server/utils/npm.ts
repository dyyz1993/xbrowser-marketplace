export interface NpmPackageInfo {
  name: string
  version: string
  dist: { tarball: string; shasum: string; integrity?: string }
  description?: string
  author?: unknown
  license?: string
}

export function parseNpmKey(key: string): { name: string; version: string } {
  if (!key.startsWith('npm://')) throw new Error(`Invalid npm key: ${key}`)
  const rest = key.slice(6)
  const atIndex = rest.lastIndexOf('@')
  if (atIndex === -1) throw new Error(`Invalid npm key format, missing version: ${key}`)
  const name = rest.slice(0, atIndex)
  const version = rest.slice(atIndex + 1)
  return { name, version }
}

export function buildNpmTarballUrl(packageName: string, version: string): string {
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
    throw new Error(`Package ${packageName}@${version} not found on npm (HTTP ${res.status})`)
  }
  return res.json() as Promise<NpmPackageInfo>
}

export type StorageType = 'npm' | 'r2'

export function parsePackageUrl(packageUrl: string): { type: StorageType; key: string } | null {
  if (packageUrl.startsWith('npm://')) {
    return { type: 'npm', key: packageUrl }
  }
  if (packageUrl.startsWith('r2://')) {
    return { type: 'r2', key: packageUrl }
  }
  return null
}
