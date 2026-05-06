import { describe, it, expect } from 'vitest'
import {
  toISOString,
  formatDate,
  parseDate,
  getTimestamp,
  transformDateField,
  transformRole,
  transformAuditLog,
} from '../date'

describe('toISOString', () => {
  it('should return ISO string from Date', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    expect(toISOString(date)).toBe('2024-06-15T12:00:00.000Z')
  })
})

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    expect(formatDate(date)).toBe('2024-01-01T00:00:00.000Z')
  })

  it('should format ISO string input', () => {
    expect(formatDate('2024-01-01T00:00:00Z')).toBe('2024-01-01T00:00:00.000Z')
  })

  it('should format timestamp number input', () => {
    const ts = new Date('2024-01-01T00:00:00Z').getTime()
    expect(formatDate(ts)).toBe('2024-01-01T00:00:00.000Z')
  })
})

describe('parseDate', () => {
  it('should parse ISO string to Date', () => {
    const result = parseDate('2024-06-15T12:00:00Z')
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe('2024-06-15T12:00:00.000Z')
  })
})

describe('getTimestamp', () => {
  it('should return a number close to Date.now()', () => {
    const ts = getTimestamp()
    expect(typeof ts).toBe('number')
    expect(Math.abs(ts - Date.now())).toBeLessThan(100)
  })
})

describe('transformDateField', () => {
  it('should return ISO string for valid Date', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    expect(transformDateField(date)).toBe('2024-01-01T00:00:00.000Z')
  })

  it('should return current ISO string for null', () => {
    const before = new Date().toISOString()
    const result = transformDateField(null)
    const after = new Date().toISOString()
    expect(result >= before).toBe(true)
    expect(result <= after).toBe(true)
  })

  it('should return current ISO string for undefined', () => {
    const result = transformDateField(undefined)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('transformRole', () => {
  it('should transform Date fields to ISO strings', () => {
    const input = {
      id: 'role-1',
      name: 'admin',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-06-01T00:00:00Z'),
    }
    const result = transformRole(input)
    expect(result.id).toBe('role-1')
    expect(result.name).toBe('admin')
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
    expect(result.updatedAt).toBe('2024-06-01T00:00:00.000Z')
  })

  it('should handle null dates with fallback', () => {
    const input = { id: 'role-2', createdAt: null, updatedAt: null }
    const result = transformRole(input)
    expect(typeof result.createdAt).toBe('string')
    expect(typeof result.updatedAt).toBe('string')
  })
})

describe('transformAuditLog', () => {
  it('should transform createdAt to ISO string', () => {
    const input = {
      id: 'log-1',
      action: 'create',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    }
    const result = transformAuditLog(input)
    expect(result.id).toBe('log-1')
    expect(result.action).toBe('create')
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z')
  })
})
