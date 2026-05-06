import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestClient } from '../../test-utils/test-client'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import { hashSync } from 'bcryptjs'

async function seedDeveloper(
  overrides: {
    id?: string
    username?: string
    email?: string
    password?: string
    apiKey?: string
    role?: string
  } = {}
) {
  const client = await getRawClient()
  if (!client || !('execute' in client)) return null

  const id = overrides.id ?? 'dev-test-1'
  const username = overrides.username ?? 'testdev'
  const email = overrides.email ?? 'testdev@example.com'
  const password = overrides.password ?? 'password123'
  const apiKey = overrides.apiKey ?? 'test-api-key-123'
  const role = overrides.role ?? 'developer'
  const now = Date.now()

  await client.execute({
    sql: `INSERT INTO developers (id, username, email, password_hash, role, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, username, email, hashSync(password, 10), role, apiKey, now, now],
  })

  return { id, username, email, apiKey, role }
}

describe('Auth Routes', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    const client = await getRawClient()
    if (client && 'execute' in client) {
      try {
        await client.execute('DELETE FROM developers')
      } catch {
        // Table may not exist yet
      }
    }
  })

  describe('POST /api/auth/register', () => {
    it('should register a new developer with valid data', async () => {
      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'newdev',
          email: 'newdev@example.com',
          password: 'secure123',
        },
      })

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('id')
        expect(data.data.username).toBe('newdev')
        expect(data.data.email).toBe('newdev@example.com')
        expect(data.data.role).toBe('developer')
      }
    })

    it('should reject registration with duplicate email', async () => {
      await seedDeveloper({ email: 'dup@example.com' })

      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'anotheruser',
          email: 'dup@example.com',
          password: 'secure123',
        },
      })

      expect(res.status).toBe(409)
    })

    it('should reject registration with duplicate username', async () => {
      await seedDeveloper({ username: 'dupuser' })

      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'dupuser',
          email: 'unique@example.com',
          password: 'secure123',
        },
      })

      expect(res.status).toBe(409)
    })

    it('should reject registration with invalid email', async () => {
      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'bademail',
          email: 'not-an-email',
          password: 'secure123',
        },
      })

      expect([400, 422]).toContain(res.status)
    })

    it('should reject registration with short password', async () => {
      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'shortpw',
          email: 'short@example.com',
          password: '12345',
        },
      })

      expect([400, 422]).toContain(res.status)
    })

    it('should reject registration with missing fields', async () => {
      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'incomplete',
        } as Record<string, unknown>,
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should reject registration with short username', async () => {
      const client = createTestClient()
      const res = await client.api.auth.register.$post({
        json: {
          username: 'a',
          email: 'short@example.com',
          password: 'secure123',
        },
      })

      expect([400, 422]).toContain(res.status)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await seedDeveloper({
        email: 'login@example.com',
        password: 'password123',
        apiKey: 'login-api-key',
      })

      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {
          email: 'login@example.com',
          password: 'password123',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('token')
        expect(data.data).toHaveProperty('profile')
        expect(data.data.token).toBe('login-api-key')
        expect(data.data.profile.email).toBe('login@example.com')
      }
    })

    it('should reject login with wrong email', async () => {
      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      })

      expect(res.status).toBe(401)
    })

    it('should reject login with wrong password', async () => {
      await seedDeveloper({
        email: 'wrongpw@example.com',
        password: 'correctpassword',
      })

      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {
          email: 'wrongpw@example.com',
          password: 'wrongpassword',
        },
      })

      expect(res.status).toBe(401)
    })

    it('should reject login with invalid email format', async () => {
      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {
          email: 'not-an-email',
          password: 'password123',
        },
      })

      expect([400, 422]).toContain(res.status)
    })

    it('should reject login with missing fields', async () => {
      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {} as Record<string, unknown>,
      })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('should return token and profile together on success', async () => {
      await seedDeveloper({
        id: 'dev-complete-1',
        username: 'completeuser',
        email: 'complete@example.com',
        role: 'developer',
        apiKey: 'complete-api-key',
      })

      const client = createTestClient()
      const res = await client.api.auth.login.$post({
        json: {
          email: 'complete@example.com',
          password: 'password123',
        },
      })

      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data.profile).toHaveProperty('id', 'dev-complete-1')
        expect(data.data.profile).toHaveProperty('username', 'completeuser')
        expect(data.data.profile).toHaveProperty('email', 'complete@example.com')
        expect(data.data.profile).toHaveProperty('role', 'developer')
        expect(data.data.profile).toHaveProperty('createdAt')
        expect(typeof data.data.profile.createdAt).toBe('number')
      }
    })
  })

  describe('GET /api/auth/verify', () => {
    it('should verify a valid developer API key', async () => {
      await seedDeveloper({
        id: 'dev-verify-1',
        username: 'verifyuser',
        email: 'verify@example.com',
        apiKey: 'verify-api-key',
        role: 'developer',
      })

      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer verify-api-key' },
      })
      const res = await client.api.auth.verify.$get()

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('id')
        expect(data.data).toHaveProperty('username')
        expect(data.data).toHaveProperty('email')
        expect(data.data).toHaveProperty('role')
      }
    })

    it('should reject verify without auth header', async () => {
      const client = createTestClient()
      const res = await client.api.auth.verify.$get()

      expect(res.status).toBe(401)
    })

    it('should reject verify with invalid API key', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer invalid-key' },
      })
      const res = await client.api.auth.verify.$get()

      expect(res.status).toBe(401)
    })

    it('should accept dev tokens in test environment', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'Bearer admin-token' },
      })
      const res = await client.api.auth.verify.$get()

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (data.success) {
        expect(data.data).toHaveProperty('id')
        expect(data.data).toHaveProperty('role')
      }
    })

    it('should reject malformed Authorization header', async () => {
      const client = createTestClient(undefined, {
        headers: { Authorization: 'NotBearer sometoken' },
      })
      const res = await client.api.auth.verify.$get()

      expect(res.status).toBe(401)
    })
  })

  describe('Auth flow integration', () => {
    it('should complete full register -> login -> verify flow', async () => {
      const client = createTestClient()

      const regRes = await client.api.auth.register.$post({
        json: {
          username: 'flowuser',
          email: 'flow@example.com',
          password: 'flowpass123',
        },
      })
      expect(regRes.status).toBe(201)
      const regData = await regRes.json()
      expect(regData.success).toBe(true)

      const loginRes = await client.api.auth.login.$post({
        json: {
          email: 'flow@example.com',
          password: 'flowpass123',
        },
      })
      expect(loginRes.status).toBe(200)
      const loginData = await loginRes.json()
      expect(loginData.success).toBe(true)

      if (loginData.success) {
        const authedClient = createTestClient(undefined, {
          headers: { Authorization: `Bearer ${loginData.data.token}` },
        })
        const verifyRes = await authedClient.api.auth.verify.$get()

        expect(verifyRes.status).toBe(200)
        const verifyData = await verifyRes.json()
        expect(verifyData.success).toBe(true)
        if (verifyData.success) {
          expect(verifyData.data.username).toBe('flowuser')
          expect(verifyData.data.email).toBe('flow@example.com')
        }
      }
    })

    it('should not allow login after registration with wrong password', async () => {
      const client = createTestClient()

      await client.api.auth.register.$post({
        json: {
          username: 'wrongpwuser',
          email: 'wrongpw@example.com',
          password: 'correctpass',
        },
      })

      const loginRes = await client.api.auth.login.$post({
        json: {
          email: 'wrongpw@example.com',
          password: 'wrongpass',
        },
      })

      expect(loginRes.status).toBe(401)
    })
  })
})
