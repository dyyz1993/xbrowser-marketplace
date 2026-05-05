import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'

function authedClient(token = 'admin-token') {
  return createTestClient(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('Export Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await cleanupTestDatabase()
  })

  describe('GET /api/admin/todos/export', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.admin.todos.export.$get()
      expect(res.status).toBe(401)
    })

    it('should return CSV data with auth', async () => {
      const client = authedClient()
      const res = await client.api.admin.todos.export.$get()

      expect(res.status).toBe(200)
      const contentType = res.headers.get('Content-Type')
      expect(contentType).toBe('text/csv')
      const contentDisposition = res.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('todos.csv')
      const text = await res.text()
      expect(text).toContain('id,title,completed,created_at')
    })
  })

  describe('POST /api/admin/todos/export/token', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.admin.todos.export.token.$post()
      expect(res.status).toBe(401)
    })

    it('should generate download token with auth', async () => {
      const client = authedClient()
      const res = await client.api.admin.todos.export.token.$post()

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('token')
        expect(data.data).toHaveProperty('downloadUrl')
        expect(data.data).toHaveProperty('expiresIn')
        expect(data.data.downloadUrl).toContain('/api/admin/todos/export/download/')
        expect(data.data.expiresIn).toBe(60000)
      }
    })

    it('should generate unique tokens on each call', async () => {
      const client = authedClient()
      const res1 = await client.api.admin.todos.export.token.$post()
      const res2 = await client.api.admin.todos.export.token.$post()

      const data1 = await res1.json()
      const data2 = await res2.json()
      expect(data1.success).toBe(true)
      expect(data2.success).toBe(true)
      if (data1.success && data2.success) {
        expect(data1.data.token).not.toBe(data2.data.token)
      }
    })
  })

  describe('GET /api/admin/todos/export/download/:token', () => {
    it('should download CSV with valid token', async () => {
      const client = authedClient()

      const tokenRes = await client.api.admin.todos.export.token.$post()
      const tokenData = await tokenRes.json()
      expect(tokenData.success).toBe(true)

      if (tokenData.success) {
        const token = tokenData.data.token
        const downloadRes = await client.api.admin.todos.export.download[':token'].$get(
          { param: { token } }
        )

        expect(downloadRes.status).toBe(200)
        const contentType = downloadRes.headers.get('Content-Type')
        expect(contentType).toBe('text/csv')
        const text = await downloadRes.text()
        expect(text).toContain('id,title,completed,created_at')
      }
    })

    it('should return 403 for invalid token', async () => {
      const client = createTestClient()
      const res = await client.api.admin.todos.export.download[':token'].$get(
        { param: { token: 'invalid-token-12345' } }
      )

      expect(res.status).toBe(403)
      const data = await res.json() as Record<string, unknown>
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid or expired')
    })

    it('should return 403 for consumed token (single-use)', async () => {
      const client = authedClient()

      const tokenRes = await client.api.admin.todos.export.token.$post()
      const tokenData = await tokenRes.json()
      expect(tokenData.success).toBe(true)

      if (tokenData.success) {
        const token = tokenData.data.token

        const firstDownload = await client.api.admin.todos.export.download[':token'].$get(
          { param: { token } }
        )
        expect(firstDownload.status).toBe(200)

        const secondDownload = await client.api.admin.todos.export.download[':token'].$get(
          { param: { token } }
        )
        expect(secondDownload.status).toBe(403)
      }
    })
  })

  describe('GET /api/admin/todos/export/stream', () => {
    it('should require authentication', async () => {
      const client = createTestClient()
      const res = await client.api.admin.todos.export.stream.$get()
      expect(res.status).toBe(401)
    })

    it('should stream CSV data with auth', async () => {
      const client = authedClient()
      const res = await client.api.admin.todos.export.stream.$get()

      expect(res.status).toBe(200)
      const contentType = res.headers.get('Content-Type')
      expect(contentType).toBe('text/csv')
      const contentDisposition = res.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('todos-stream.csv')
      const text = await res.text()
      expect(text).toContain('id,title,completed,created_at')
    })
  })
})
