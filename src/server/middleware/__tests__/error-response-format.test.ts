import { describe, it, expect } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'

function authedClient(token: string) {
  return createTestClient(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('Error Response Format', () => {
  describe('Authentication Errors', () => {
    it('should return JSON format for missing authentication token', async () => {
      const client = createTestClient()

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(401)

      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('application/json')

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.stringContaining('Authentication token is required'),
        status: 401,
      })
    })

    it('should return JSON format for invalid authentication token', async () => {
      const client = authedClient('invalid-token')

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(401)

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid token'),
        status: 401,
      })
    })
  })

  describe('Permission Errors', () => {
    it('should return JSON format for insufficient permissions', async () => {
      const client = authedClient('user-token')

      const res = await client.api.admin.stats.$get()

      expect(res.status).toBe(403)

      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('application/json')

      const data = await res.json()
      expect(data).toMatchObject({
        success: false,
        error: expect.stringContaining('Insufficient role'),
        status: 403,
      })
    })
  })

  describe('All error responses should be JSON', () => {
    it('should never return plain text error', async () => {
      const client = createTestClient()

      const res = await client.api.admin.stats.$get()

      const text = await res.text()

      expect(() => JSON.parse(text)).not.toThrow()

      expect(text.trim().startsWith('{')).toBe(true)
      expect(text.trim().endsWith('}')).toBe(true)
    })
  })
})
