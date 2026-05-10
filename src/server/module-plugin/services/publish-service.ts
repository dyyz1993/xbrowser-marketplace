import { getDb } from '../../db'
import { plugins, pluginVersions } from '../../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { generateUUID } from '../../utils/uuid'
import { NotFoundError, AuthorizationError, ConflictError } from '../../utils/app-error'
import type { CreateVersionInput } from '../plugin.types'
import {
  R2Storage,
  NpmMirrorStorage,
  validateNpmPackage,
  resolveDownloadUrl,
  type StorageType,
} from './storage-service'

type PluginRow = typeof plugins.$inferSelect
type VersionRow = typeof pluginVersions.$inferSelect

export interface PublishData {
  name: string
  slug: string
  version: string
  description: string
  authorName: string
  repositoryUrl: string | null
  homepageUrl: string | null
  npmPackage: string | null
  license: string
  commands: string[]
  tags: string[]
  siteUrls: string[]
  storageType: StorageType
}

export interface PublishFiles {
  files: { path: string; content: ArrayBuffer }[]
  totalSize: number
  checksum: string | null
}

import { serializeJsonField } from '../../utils/json'

async function resolvePackageUrl(
  data: PublishData,
  files: PublishFiles,
  env: { R2_BUCKET?: R2Bucket }
): Promise<{ packageUrl: string; fileSize: number | null }> {
  if (data.storageType === 'npm') {
    const packageName = data.npmPackage || data.name
    await validateNpmPackage(packageName, data.version)
    return {
      packageUrl: NpmMirrorStorage.buildKey(packageName, data.version),
      fileSize: null,
    }
  }

  if (!env.R2_BUCKET) {
    if (files.files.length > 0) {
      throw new Error('R2 storage is not configured. Cannot upload plugin files.')
    }
    return {
      packageUrl: `db://${data.slug}/${data.version}`,
      fileSize: null,
    }
  }

  if (files.files.length === 0) {
    throw new Error('No files provided for R2 storage')
  }

  let tarballData: Buffer | ArrayBuffer
  if (files.files.length === 1) {
    tarballData = files.files[0].content
  } else {
    tarballData = Buffer.concat(files.files.map(f => Buffer.from(f.content)))
  }

  const packageUrl = await R2Storage.uploadPluginTarball(
    env.R2_BUCKET,
    data.slug,
    data.version,
    tarballData
  )

  return {
    packageUrl,
    fileSize: files.totalSize,
  }
}

export async function publishPlugin(
  data: PublishData,
  files: PublishFiles,
  authorId: string,
  _authorName: string,
  env: { R2_BUCKET?: R2Bucket } = {}
) {
  const db = await getDb()
  const { packageUrl, fileSize } = await resolvePackageUrl(data, files, env)

  const existing: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, data.slug))
    .limit(1)

  if (existing.length > 0) {
    if (existing[0].authorId !== authorId) {
      throw new AuthorizationError('Only the plugin author can publish updates')
    }

    const existingVersions = await db
      .select({ id: pluginVersions.id })
      .from(pluginVersions)
      .where(
        and(eq(pluginVersions.pluginId, existing[0].id), eq(pluginVersions.version, data.version))
      )
      .limit(1)

    if (existingVersions.length > 0) {
      throw new ConflictError(
        `Version '${data.version}' already exists for plugin '${data.slug}'. Use a different version number.`
      )
    }

    const updateData: Record<string, unknown> = {
      name: data.name,
      description: data.description,
      version: data.version,
      repositoryUrl: data.repositoryUrl,
      homepageUrl: data.homepageUrl,
      npmPackage: data.npmPackage,
      license: data.license,
      tags: serializeJsonField(data.tags),
      commands: serializeJsonField(data.commands),
      siteUrls: serializeJsonField(data.siteUrls),
      updatedAt: new Date(),
    }

    await db.update(plugins).set(updateData).where(eq(plugins.id, existing[0].id))

    const versionId = generateUUID()
    const now = new Date()
    await db.insert(pluginVersions).values({
      id: versionId,
      pluginId: existing[0].id,
      version: data.version,
      changelog: null,
      packageUrl,
      fileSize,
      checksum: files.checksum,
      status: 'pending',
      publishedAt: now,
    })

    const updated = await db.select().from(plugins).where(eq(plugins.slug, data.slug)).limit(1)

    return {
      id: updated[0].id,
      name: updated[0].name,
      slug: updated[0].slug,
      description: updated[0].description,
      authorName: updated[0].authorName,
      version: updated[0].version,
      status: updated[0].status,
      downloadCount: updated[0].downloadCount ?? 0,
      viewCount: updated[0].viewCount ?? 0,
      featured: updated[0].featured ?? false,
      screenshotUrl: updated[0].screenshotUrl,
      tags: data.tags,
      siteUrls: data.siteUrls,
      commands: data.commands,
      authorId: updated[0].authorId,
      readme: updated[0].readme,
      repositoryUrl: updated[0].repositoryUrl,
      homepageUrl: updated[0].homepageUrl,
      npmPackage: updated[0].npmPackage,
      license: updated[0].license,
      categories: [],
      versions: [],
      createdAt: updated[0].createdAt.getTime(),
      updatedAt: updated[0].updatedAt.getTime(),
    }
  }

  const id = generateUUID()
  const now = new Date()

  await db.insert(plugins).values({
    id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    readme: null,
    authorId,
    authorName: data.authorName,
    repositoryUrl: data.repositoryUrl,
    homepageUrl: data.homepageUrl,
    npmPackage: data.npmPackage,
    license: data.license,
    version: data.version,
    status: 'pending',
    screenshotUrl: null,
    siteUrls: serializeJsonField(data.siteUrls),
    tags: serializeJsonField(data.tags),
    commands: serializeJsonField(data.commands),
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(pluginVersions).values({
    id: generateUUID(),
    pluginId: id,
    version: data.version,
    changelog: null,
    packageUrl,
    fileSize,
    checksum: files.checksum,
    status: 'pending',
    publishedAt: now,
  })

  return {
    id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    authorName: data.authorName,
    version: data.version,
    status: 'pending',
    downloadCount: 0,
    viewCount: 0,
    featured: false,
    screenshotUrl: null,
    tags: data.tags,
    siteUrls: data.siteUrls,
    commands: data.commands,
    authorId,
    readme: null,
    repositoryUrl: data.repositoryUrl,
    homepageUrl: data.homepageUrl,
    npmPackage: data.npmPackage,
    license: data.license,
    categories: [],
    versions: [],
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  }
}

export async function publishVersion(
  slug: string,
  data: CreateVersionInput,
  authorId: string
): Promise<VersionRow> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  if (pluginRows[0].authorId !== authorId) {
    throw new AuthorizationError('Only the plugin author can publish versions')
  }

  const existingVersions = await db
    .select({ id: pluginVersions.id })
    .from(pluginVersions)
    .where(
      and(eq(pluginVersions.pluginId, pluginRows[0].id), eq(pluginVersions.version, data.version))
    )
    .limit(1)

  if (existingVersions.length > 0) {
    throw new ConflictError(
      `Version '${data.version}' already exists for plugin '${slug}'. Use a different version number.`
    )
  }

  const id = generateUUID()
  const now = new Date()

  await db.insert(pluginVersions).values({
    id,
    pluginId: pluginRows[0].id,
    version: data.version,
    changelog: data.changelog ?? null,
    packageUrl: `tarball://${slug}/${data.version}`,
    fileSize: null,
    checksum: null,
    status: 'pending',
    publishedAt: now,
  })

  await db
    .update(plugins)
    .set({ version: data.version, updatedAt: now })
    .where(eq(plugins.id, pluginRows[0].id))

  const rows: VersionRow[] = await db
    .select()
    .from(pluginVersions)
    .where(eq(pluginVersions.id, id))
    .limit(1)

  return rows[0]
}

export async function getTarballInfo(
  slug: string,
  env: { R2_BUCKET?: R2Bucket } = {}
): Promise<{ url: string; stream?: ReadableStream }> {
  const db = await getDb()

  const pluginRows: PluginRow[] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.slug, slug))
    .limit(1)

  if (pluginRows.length === 0) {
    throw new NotFoundError('Plugin', slug)
  }

  const versionRows: VersionRow[] = await db
    .select()
    .from(pluginVersions)
    .where(eq(pluginVersions.pluginId, pluginRows[0].id))
    .orderBy(desc(pluginVersions.publishedAt))
    .limit(1)

  if (versionRows.length === 0 || !versionRows[0].packageUrl) {
    throw new NotFoundError('Tarball', slug)
  }

  const packageUrl = versionRows[0].packageUrl

  if (packageUrl.startsWith('npm://')) {
    const downloadUrl = resolveDownloadUrl(packageUrl)
    return { url: downloadUrl || packageUrl }
  }

  if (packageUrl.startsWith('r2://') && env.R2_BUCKET) {
    const key = packageUrl.slice(5)
    const r2Object = await env.R2_BUCKET.get(key)
    if (!r2Object) {
      throw new NotFoundError('Tarball', key)
    }
    return {
      url: packageUrl,
      stream: r2Object.body,
    }
  }

  return { url: packageUrl }
}
