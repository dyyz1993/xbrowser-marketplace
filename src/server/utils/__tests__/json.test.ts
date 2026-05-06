import { describe, it, expect } from 'vitest'
import { parseJsonField, serializeJsonField } from '../json'

describe('parseJsonField', () => {
  it('should parse valid JSON string', () => {
    const result = parseJsonField<string[]>('["a","b"]')
    expect(result).toEqual(['a', 'b'])
  })

  it('should parse valid JSON object', () => {
    const result = parseJsonField<{ key: string }>('{"key":"value"}')
    expect(result).toEqual({ key: 'value' })
  })

  it('should return undefined for null input', () => {
    expect(parseJsonField(null)).toBeUndefined()
  })

  it('should return undefined for undefined input', () => {
    expect(parseJsonField(undefined)).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    expect(parseJsonField('')).toBeUndefined()
  })

  it('should return undefined for invalid JSON', () => {
    expect(parseJsonField('not-json')).toBeUndefined()
  })

  it('should parse JSON primitive values', () => {
    expect(parseJsonField<number>('42')).toBe(42)
    expect(parseJsonField<boolean>('true')).toBe(true)
  })
})

describe('serializeJsonField', () => {
  it('should serialize string array to JSON', () => {
    expect(serializeJsonField(['a', 'b'])).toBe('["a","b"]')
  })

  it('should return undefined for empty array', () => {
    expect(serializeJsonField([])).toBeUndefined()
  })

  it('should return undefined for undefined input', () => {
    expect(serializeJsonField(undefined)).toBeUndefined()
  })

  it('should handle single-element array', () => {
    expect(serializeJsonField(['only'])).toBe('["only"]')
  })
})
