import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LRUCache } from '../lru-cache'

describe('LRUCache', () => {
  let cache: LRUCache<string>

  beforeEach(() => {
    cache = new LRUCache<string>(3, 5000)
  })

  it('should store and retrieve values', () => {
    cache.set('a', 'value-a')
    expect(cache.get('a')).toBe('value-a')
  })

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('missing')).toBeUndefined()
  })

  it('should expire entries after TTL', () => {
    vi.useFakeTimers()
    const ttlCache = new LRUCache<string>(10, 1000)
    ttlCache.set('a', 'value-a')
    vi.advanceTimersByTime(999)
    expect(ttlCache.get('a')).toBe('value-a')
    vi.advanceTimersByTime(2)
    expect(ttlCache.get('a')).toBeUndefined()
    vi.useRealTimers()
  })

  it('should evict oldest entry when maxSize is reached', () => {
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.set('d', '4')
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe('2')
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })

  it('should update LRU order on get', () => {
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.get('a')
    cache.set('d', '4')
    expect(cache.get('a')).toBe('1')
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })

  it('should update value and move to end on re-set', () => {
    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    cache.set('a', 'updated')
    cache.set('d', '4')
    expect(cache.get('a')).toBe('updated')
    expect(cache.get('b')).toBeUndefined()
  })

  it('should clear all entries', () => {
    cache.set('a', '1')
    cache.set('b', '2')
    cache.clear()
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
  })

  it('should handle maxSize of 1', () => {
    const single = new LRUCache<string>(1, 5000)
    single.set('a', '1')
    single.set('b', '2')
    expect(single.get('a')).toBeUndefined()
    expect(single.get('b')).toBe('2')
  })
})
