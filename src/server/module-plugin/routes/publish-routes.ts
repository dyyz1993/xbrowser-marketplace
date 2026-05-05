import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import { authMiddleware } from '../../middleware/auth'
import { successResponse, errorResponse, success, created } from '../../utils/route-helpers'
import {
  PluginDetailSchema,
  VersionSchema,
  TarballInfoSchema,
} from '@shared/modules/plugins'
import { PluginSlugSchema, PublishMetadataSchema, CreateVersionSchema } from '../plugin.types'
import * as publishService from '../services/publish-service'

function getR2Bucket(): R2Bucket | undefined {
  return (globalThis as unknown as { R2_BUCKET?: R2Bucket }).R2_BUCKET
}

const publishPluginRoute = createRoute({
  method: 'post',
  path: '/plugins/publish',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    body: { content: { 'multipart/form-data': { schema: z.any() } } },
  },
  responses: {
    201: successResponse(PluginDetailSchema, 'Plugin published'),
    409: errorResponse('Plugin slug already exists'),
  },
})

const publishVersionRoute = createRoute({
  method: 'post',
  path: '/plugins/{slug}/versions',
  tags: ['plugins'],
  security: [{ Bearer: [] }],
  middleware: [authMiddleware()],
  request: {
    params: PluginSlugSchema,
    body: { content: { 'application/json': { schema: CreateVersionSchema } } },
  },
  responses: {
    201: successResponse(VersionSchema, 'Version published'),
    404: errorResponse('Plugin not found'),
  },
})

const downloadTarballRoute = createRoute({
  method: 'get',
  path: '/plugins/{slug}/tarball',
  tags: ['plugins'],
  request: {
    params: PluginSlugSchema,
  },
  responses: {
    200: successResponse(TarballInfoSchema, 'Tarball download info'),
    404: errorResponse('Plugin not found'),
  },
})

export const publishRoutes = new OpenAPIHono()
  .openapi(publishPluginRoute, async (c) => {
    const user = c.get('authUser')
    const body = await c.req.parseBody()

    const metadataStr = body['metadata']
    if (!metadataStr || typeof metadataStr === 'string') {
      return c.json({ success: false, error: 'Missing metadata' }, 400)
    }
    const metadataText = await (metadataStr as File).text()
    const rawMeta = JSON.parse(metadataText)

    const meta = PublishMetadataSchema.parse(rawMeta)
    const checksum = typeof body['checksum'] === 'string' ? body['checksum'] : null

    const files: { path: string; content: ArrayBuffer }[] = []
    const fileEntries = body['files']
    if (fileEntries) {
      if (Array.isArray(fileEntries)) {
        for (const f of fileEntries) {
          if (f instanceof File) {
            files.push({ path: f.name, content: await f.arrayBuffer() })
          }
        }
      } else if (fileEntries instanceof File) {
        files.push({ path: fileEntries.name, content: await fileEntries.arrayBuffer() })
      }
    }

    const totalSize = files.reduce((sum, f) => sum + f.content.byteLength, 0)

    const plugin = await publishService.publishPlugin(
      {
        name: meta.name,
        slug: meta.slug,
        version: meta.version,
        description: meta.description,
        authorName: meta.author || user.username,
        repositoryUrl: meta.repositoryUrl ?? null,
        homepageUrl: meta.homepageUrl ?? null,
        npmPackage: meta.npmPackage ?? null,
        license: meta.license ?? 'MIT',
        commands: meta.commands ?? [],
        tags: meta.tags ?? [],
        siteUrls: meta.sites ?? [],
        storageType: meta.storageType ?? 'r2',
      },
      {
        files,
        totalSize,
        checksum,
      },
      user.id,
      user.username,
      { R2_BUCKET: getR2Bucket() }
    )

    return c.json(created(plugin), 201)
  })
  .openapi(publishVersionRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const data = c.req.valid('json')
    const user = c.get('authUser')
    const version = await publishService.publishVersion(slug, data, user.id)
    return c.json(
      created({
        id: version.id,
        version: version.version,
        changelog: version.changelog,
        packageUrl: version.packageUrl,
        fileSize: version.fileSize,
        checksum: version.checksum,
        status: version.status,
        publishedAt: version.publishedAt.getTime(),
      }),
      201
    )
  })
  .openapi(downloadTarballRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const result = await publishService.getTarballInfo(slug, { R2_BUCKET: getR2Bucket() })

    if (result.stream) {
      return new Response(result.stream, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${slug}.tar.gz"`,
        },
      })
    }

    if (result.url.startsWith('http')) {
      return c.redirect(result.url, 302)
    }

    return c.json(success({ url: result.url }), 200)
  })
