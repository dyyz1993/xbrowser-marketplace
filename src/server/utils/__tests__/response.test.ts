import { describe, it, expect } from 'vitest'
import { success, created, list, deleted } from '../response'

describe('response helpers', () => {
  describe('success', () => {
    it('should return success shape with data', () => {
      const result = success({ name: 'test' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'test' })
      expect(result.timestamp).toBeTruthy()
    })

    it('should work with primitive data', () => {
      const result = success(42)
      expect(result.data).toBe(42)
    })
  })

  describe('created', () => {
    it('should return success shape with created data', () => {
      const result = created({ id: '1' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: '1' })
      expect(typeof result.timestamp).toBe('string')
    })
  })

  describe('list', () => {
    it('should return items without count when count not provided', () => {
      const result = list(['a', 'b'])
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ items: ['a', 'b'] })
    })

    it('should return items with count when count is provided', () => {
      const result = list(['a', 'b'], 100)
      expect(result.data).toEqual({ items: ['a', 'b'], count: 100 })
    })

    it('should return items with count 0', () => {
      const result = list([], 0)
      expect(result.data).toEqual({ items: [], count: 0 })
    })

    it('should handle empty items array without count', () => {
      const result = list([])
      expect(result.data).toEqual({ items: [] })
    })
  })

  describe('deleted', () => {
    it('should return success shape with deleted id', () => {
      const result = deleted('abc-123')
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: 'abc-123' })
      expect(typeof result.timestamp).toBe('string')
    })
  })

  describe('timestamp format', () => {
    it('all helpers should produce valid ISO timestamps', () => {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      expect(success({}).timestamp).toMatch(isoRegex)
      expect(created({}).timestamp).toMatch(isoRegex)
      expect(list([]).timestamp).toMatch(isoRegex)
      expect(deleted('1').timestamp).toMatch(isoRegex)
    })
  })
})
