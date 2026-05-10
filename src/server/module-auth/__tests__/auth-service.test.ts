import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import * as authService from '../services/auth-service'
import { setupTestDatabase, cleanupTestDatabase } from '../../db/test-setup'
import { getRawClient } from '../../db'
import { ConflictError, AuthenticationError, NotFoundError } from '../../utils/app-error'
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

describe('Auth Service', () => {
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

  describe('registerDeveloper', () => {
    it('should register a new developer', async () => {
      const profile = await authService.registerDeveloper({
        username: 'newdev',
        email: 'newdev@example.com',
        password: 'secure123',
      })

      expect(profile).toHaveProperty('id')
      expect(profile.username).toBe('newdev')
      expect(profile.email).toBe('newdev@example.com')
      expect(profile.role).toBe('developer')
      expect(profile.createdAt).toBeDefined()
    })

    it('should throw ConflictError when email already exists', async () => {
      await seedDeveloper({ email: 'taken@example.com' })

      await expect(
        authService.registerDeveloper({
          username: 'another-user',
          email: 'taken@example.com',
          password: 'secure123',
        })
      ).rejects.toThrow(ConflictError)

      await expect(
        authService.registerDeveloper({
          username: 'another-user',
          email: 'taken@example.com',
          password: 'secure123',
        })
      ).rejects.toThrow('Email already registered')
    })

    it('should throw ConflictError when username already exists', async () => {
      await seedDeveloper({ username: 'takenuser' })

      await expect(
        authService.registerDeveloper({
          username: 'takenuser',
          email: 'unique@example.com',
          password: 'secure123',
        })
      ).rejects.toThrow(ConflictError)

      await expect(
        authService.registerDeveloper({
          username: 'takenuser',
          email: 'unique@example.com',
          password: 'secure123',
        })
      ).rejects.toThrow('Username already taken')
    })

    it('should store a hashed password (not plaintext)', async () => {
      await authService.registerDeveloper({
        username: 'hashtest',
        email: 'hashtest@example.com',
        password: 'mypassword',
      })

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute({
          sql: `SELECT password_hash FROM developers WHERE username = ?`,
          args: ['hashtest'],
        })
        const rows = result.rows
        expect(rows.length).toBe(1)
        expect(rows[0].password_hash).not.toBe('mypassword')
        const hash = rows[0].password_hash
        expect(typeof hash).toBe('string')
        expect((hash as string).length).toBeGreaterThan(0)
      }
    })

    it('should generate a unique API key', async () => {
      const profile1 = await authService.registerDeveloper({
        username: 'dev1',
        email: 'dev1@example.com',
        password: 'pass123',
      })
      const profile2 = await authService.registerDeveloper({
        username: 'dev2',
        email: 'dev2@example.com',
        password: 'pass123',
      })

      expect(profile1.id).not.toBe(profile2.id)

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const r1 = await client.execute({
          sql: `SELECT api_key FROM developers WHERE id = ?`,
          args: [profile1.id],
        })
        const r2 = await client.execute({
          sql: `SELECT api_key FROM developers WHERE id = ?`,
          args: [profile2.id],
        })
        expect(r1.rows[0].api_key).not.toBe(r2.rows[0].api_key)
      }
    })
  })

  describe('loginDeveloper', () => {
    it('should login with valid credentials via email', async () => {
      await seedDeveloper({
        id: 'dev-login-1',
        email: 'login@example.com',
        password: 'password123',
        apiKey: 'login-api-key',
      })

      const result = await authService.loginDeveloper({
        account: 'login@example.com',
        password: 'password123',
      })

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('profile')
      expect(result.token).toBe('login-api-key')
      expect(result.profile.email).toBe('login@example.com')
      expect(result.profile.username).toBe('testdev')
    })

    it('should login with valid credentials via username', async () => {
      await seedDeveloper({
        id: 'dev-login-2',
        username: 'specialuser',
        email: 'special@example.com',
        password: 'password123',
        apiKey: 'username-api-key',
      })

      const result = await authService.loginDeveloper({
        account: 'specialuser',
        password: 'password123',
      })

      expect(result.token).toBe('username-api-key')
      expect(result.profile.username).toBe('specialuser')
    })

    it('should throw AuthenticationError for non-existent account', async () => {
      await expect(
        authService.loginDeveloper({
          account: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(AuthenticationError)

      await expect(
        authService.loginDeveloper({
          account: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid account or password')
    })

    it('should throw AuthenticationError for wrong password', async () => {
      await seedDeveloper({
        email: 'wrongpass@example.com',
        password: 'correctpassword',
      })

      await expect(
        authService.loginDeveloper({
          account: 'wrongpass@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(AuthenticationError)

      await expect(
        authService.loginDeveloper({
          account: 'wrongpass@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid account or password')
    })

    it('should return the API key as the token', async () => {
      const apiKey = 'my-special-api-key'
      await seedDeveloper({
        email: 'apikey@example.com',
        password: 'password123',
        apiKey,
      })

      const result = await authService.loginDeveloper({
        account: 'apikey@example.com',
        password: 'password123',
      })

      expect(result.token).toBe(apiKey)
    })

    it('should return profile with correct fields', async () => {
      await seedDeveloper({
        id: 'dev-profile-1',
        username: 'profileuser',
        email: 'profile@example.com',
        role: 'developer',
      })

      const result = await authService.loginDeveloper({
        account: 'profile@example.com',
        password: 'password123',
      })

      expect(result.profile).toHaveProperty('id')
      expect(result.profile).toHaveProperty('username')
      expect(result.profile).toHaveProperty('email')
      expect(result.profile).toHaveProperty('role')
      expect(result.profile).toHaveProperty('createdAt')
      expect(result.profile.id).toBe('dev-profile-1')
      expect(result.profile.username).toBe('profileuser')
      expect(result.profile.role).toBe('developer')
    })
  })

  describe('verifyApiKey', () => {
    it('should verify a valid API key', async () => {
      await seedDeveloper({
        id: 'dev-verify-1',
        apiKey: 'valid-api-key',
        username: 'verifyuser',
        email: 'verify@example.com',
      })

      const profile = await authService.verifyApiKey('valid-api-key')

      expect(profile.id).toBe('dev-verify-1')
      expect(profile.username).toBe('verifyuser')
      expect(profile.email).toBe('verify@example.com')
    })

    it('should throw AuthenticationError for invalid API key', async () => {
      await expect(authService.verifyApiKey('nonexistent-key')).rejects.toThrow(AuthenticationError)

      await expect(authService.verifyApiKey('nonexistent-key')).rejects.toThrow('Invalid API key')
    })

    it('should throw AuthenticationError for empty API key', async () => {
      await expect(authService.verifyApiKey('')).rejects.toThrow(AuthenticationError)
    })

    it('should not return the password hash', async () => {
      await seedDeveloper({ apiKey: 'safe-key' })

      const profile = await authService.verifyApiKey('safe-key')

      expect(profile).not.toHaveProperty('passwordHash')
      expect(profile).not.toHaveProperty('password_hash')
    })
  })

  describe('getDeveloperById', () => {
    it('should return developer by id', async () => {
      await seedDeveloper({
        id: 'dev-byid-1',
        username: 'byiduser',
        email: 'byid@example.com',
        role: 'developer',
      })

      const profile = await authService.getDeveloperById('dev-byid-1')

      expect(profile.id).toBe('dev-byid-1')
      expect(profile.username).toBe('byiduser')
      expect(profile.email).toBe('byid@example.com')
      expect(profile.role).toBe('developer')
    })

    it('should throw NotFoundError for non-existent id', async () => {
      await expect(authService.getDeveloperById('nonexistent-id')).rejects.toThrow(NotFoundError)

      await expect(authService.getDeveloperById('nonexistent-id')).rejects.toThrow(
        'Developer not found'
      )
    })

    it('should not expose password hash in profile', async () => {
      await seedDeveloper({ id: 'dev-safe-1' })

      const profile = await authService.getDeveloperById('dev-safe-1')

      const profileObj = profile as Record<string, unknown>
      expect(profileObj).not.toHaveProperty('passwordHash')
      expect(profileObj).not.toHaveProperty('password_hash')
    })
  })

  describe('Password Security', () => {
    it('should use bcrypt for password hashing', async () => {
      await authService.registerDeveloper({
        username: 'bcryptuser',
        email: 'bcrypt@example.com',
        password: 'testpassword',
      })

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const result = await client.execute({
          sql: `SELECT password_hash FROM developers WHERE email = ?`,
          args: ['bcrypt@example.com'],
        })
        const hash = result.rows[0].password_hash as string
        expect(hash).toMatch(/^\$2[ayb]\$/)
      }
    })

    it('should produce different hashes for same password', async () => {
      await authService.registerDeveloper({
        username: 'saltuser1',
        email: 'salt1@example.com',
        password: 'samepassword',
      })
      await authService.registerDeveloper({
        username: 'saltuser2',
        email: 'salt2@example.com',
        password: 'samepassword',
      })

      const client = await getRawClient()
      if (client && 'execute' in client) {
        const r1 = await client.execute({
          sql: `SELECT password_hash FROM developers WHERE email = ?`,
          args: ['salt1@example.com'],
        })
        const r2 = await client.execute({
          sql: `SELECT password_hash FROM developers WHERE email = ?`,
          args: ['salt2@example.com'],
        })
        expect(r1.rows[0].password_hash).not.toBe(r2.rows[0].password_hash)
      }
    })
  })
})
