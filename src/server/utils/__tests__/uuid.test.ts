import { describe, it, expect } from 'vitest'
import { generateUUID } from '../uuid'

describe('generateUUID', () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  it('should return a valid UUID v4 format', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(UUID_REGEX)
  })

  it('should generate unique UUIDs on consecutive calls', () => {
    const uuids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID())
    }
    expect(uuids.size).toBe(100)
  })

  it('should be a string of length 36', () => {
    const uuid = generateUUID()
    expect(uuid).toHaveLength(36)
  })

  it('should contain 4 hyphens at correct positions', () => {
    const uuid = generateUUID()
    expect(uuid[8]).toBe('-')
    expect(uuid[13]).toBe('-')
    expect(uuid[18]).toBe('-')
    expect(uuid[23]).toBe('-')
  })

  it('should have version 4 indicator at position 14', () => {
    const uuid = generateUUID()
    expect(uuid[14]).toBe('4')
  })

  it('should have valid variant bits at position 19', () => {
    const uuid = generateUUID()
    const variantChar = uuid[19].toLowerCase()
    expect(['8', '9', 'a', 'b']).toContain(variantChar)
  })
})
