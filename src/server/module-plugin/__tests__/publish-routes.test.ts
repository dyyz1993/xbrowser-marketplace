import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createApp } from '../../app'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'

function authHeaders(token = 'admin-token') {
  return { Authorization: `Bearer ${token}` }
}

function doFetch(path: string, init?: RequestInit) {
  const application = createApp()
  const headers: Record<string, string> = {
    'User-Agent': 'TestClient/1.0',
    ...((init?.headers as Record<string, string>) ?? {}),
  }
  if (init?.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const req = new Request(`http://localhost${path}`, { ...init, headers })
  return application.fetch(req)
}

async function seedOwnedPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-owned',
      'Owned Plugin',
      'owned-plugin',
      'A plugin owned by user-1 for publish testing',
      'user-1',
      'testuser',
      '1.0.0',
      'approved',
      '["test"]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, changelog, package_url, file_size, checksum, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ver-owned-1',
      'plugin-owned',
      '1.0.0',
      null,
      'db://owned-plugin/1.0.0',
      null,
      null,
      'approved',
      now,
    ],
  })
}

async function seedAdminPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-admin',
      'Admin Plugin',
      'admin-plugin',
      'A plugin owned by admin for testing not-owner scenarios',
      'super-admin-1',
      'superadmin',
      '1.0.0',
      'approved',
      '[]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
}

async function seedNpmPlugin() {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return
  const now = Date.now()
  await client.execute({
    sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'plugin-npm',
      'NPM Plugin',
      'npm-plugin',
      'A plugin stored on npm',
      'super-admin-1',
      'superadmin',
      '1.0.0',
      'approved',
      '[]',
      '[]',
      '[]',
      now,
      now,
    ],
  })
  await client.execute({
    sql: `INSERT INTO plugin_versions (id, plugin_id, version, changelog, package_url, file_size, checksum, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'ver-npm-1',
      'plugin-npm',
      '1.0.0',
      null,
      'npm://some-package@1.0.0',
      null,
      null,
      'approved',
      now,
    ],
  })
}

describe('Publish Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('POST /api/plugins/publish', () => {
    it('should require authentication', async () => {
      const formData = new FormData()
      const metadata = new File(
        [
          JSON.stringify({
            name: 'Test',
            slug: 'test-pub',
            version: '1.0.0',
            description: 'A test plugin',
          }),
        ],
        'metadata.json',
        { type: 'application/json' }
      )
      formData.append('metadata', metadata)

      const res = await doFetch('/api/plugins/publish', {
        method: 'POST',
        body: formData,
      })
      expect(res.status).toBe(401)
    })

    it('should reject missing metadata', async () => {
      const res = await doFetch('/api/plugins/publish', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        body: JSON.stringify({}),
      })
      expect([400, 500]).toContain(res.status)
    })

    it('should reject invalid metadata structure', async () => {
      const res = await doFetch('/api/plugins/publish', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        body: JSON.stringify({ metadata: 'not-a-file' }),
      })
      expect([400, 500]).toContain(res.status)
    })
  })

  describe('POST /api/plugins/:slug/versions', () => {
    it('should publish a new version for owned plugin', async () => {
      await seedOwnedPlugin()
      const res = await doFetch('/api/plugins/owned-plugin/versions', {
        method: 'POST',
        headers: authHeaders('user-token'),
        body: JSON.stringify({ version: '1.1.0', changelog: 'Bug fixes' }),
      })
      expect(res.status).toBe(201)
      const data = (await res.json()) as {
        success: boolean
        data: { version: string; changelog: string }
      }
      if (data.success) {
        expect(data.data.version).toBe('1.1.0')
        expect(data.data.changelog).toBe('Bug fixes')
      }
    })

    it('should reject version publish for non-owner', async () => {
      await seedAdminPlugin()
      const res = await doFetch('/api/plugins/admin-plugin/versions', {
        method: 'POST',
        headers: authHeaders('user-token'),
        body: JSON.stringify({ version: '2.0.0' }),
      })
      expect(res.status).toBe(403)
    })

    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/plugins/non-existent/versions', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ version: '1.0.0' }),
      })
      expect(res.status).toBe(404)
    })

    it('should require authentication', async () => {
      await seedOwnedPlugin()
      const res = await doFetch('/api/plugins/owned-plugin/versions', {
        method: 'POST',
        body: JSON.stringify({ version: '1.1.0' }),
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/plugins/:slug/tarball', () => {
    it('should return 404 for non-existent plugin', async () => {
      const res = await doFetch('/api/plugins/no-such-plugin/tarball')
      expect(res.status).toBe(404)
    })

    it('should return 404 for plugin without versions', async () => {
      const client = await getRawClient()
      if (!client || !('execute' in client)) return
      const now = Date.now()
      await client.execute({
        sql: `INSERT INTO plugins (id, name, slug, description, author_id, author_name, version, status, tags, site_urls, commands, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'plugin-nover',
          'No Version',
          'no-version-plugin',
          'No versions',
          'super-admin-1',
          'admin',
          '1.0.0',
          'approved',
          '[]',
          '[]',
          '[]',
          now,
          now,
        ],
      })
      const res = await doFetch('/api/plugins/no-version-plugin/tarball')
      expect(res.status).toBe(404)
    })

    it('should return url for db-stored package', async () => {
      await seedOwnedPlugin()
      const res = await doFetch('/api/plugins/owned-plugin/tarball')
      expect([200, 302]).toContain(res.status)
    })

    it('should redirect for npm-stored package', async () => {
      await seedNpmPlugin()
      const res = await doFetch('/api/plugins/npm-plugin/tarball')
      expect([200, 302]).toContain(res.status)
    })
  })
})
