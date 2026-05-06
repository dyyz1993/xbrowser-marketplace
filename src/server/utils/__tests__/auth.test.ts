import { describe, it, expect } from 'vitest'
import { verifyToken, getMockUsers, getMockTokens } from '../auth'
import { Role } from '@shared/modules/permission'

describe('auth utils', () => {
  describe('verifyToken', () => {
    it('should return super admin user for super-admin-token', () => {
      const user = verifyToken('super-admin-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('1')
      expect(user!.role).toBe(Role.SUPER_ADMIN)
      expect(user!.username).toBe('superadmin')
    })

    it('should return customer service user for customer-service-token', () => {
      const user = verifyToken('customer-service-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('2')
      expect(user!.role).toBe(Role.CUSTOMER_SERVICE)
    })

    it('should return regular user for user-token', () => {
      const user = verifyToken('user-token')
      expect(user).not.toBeNull()
      expect(user!.id).toBe('3')
      expect(user!.role).toBe(Role.USER)
    })

    it('should return null for invalid token', () => {
      expect(verifyToken('invalid-token')).toBeNull()
    })

    it('should return null for empty string token', () => {
      expect(verifyToken('')).toBeNull()
    })
  })

  describe('getMockUsers', () => {
    it('should return 3 mock users', () => {
      const users = getMockUsers()
      expect(users).toHaveLength(3)
    })

    it('should have correct role distribution', () => {
      const users = getMockUsers()
      const roles = users.map(u => u.role)
      expect(roles).toContain(Role.SUPER_ADMIN)
      expect(roles).toContain(Role.CUSTOMER_SERVICE)
      expect(roles).toContain(Role.USER)
    })
  })

  describe('getMockTokens', () => {
    it('should return 3 token entries', () => {
      const tokens = getMockTokens()
      expect(tokens.size).toBe(3)
    })

    it('should map tokens to valid user IDs', () => {
      const tokens = getMockTokens()
      const userIds = getMockUsers().map(u => u.id)
      tokens.forEach(userId => {
        expect(userIds).toContain(userId)
      })
    })
  })
})
