import { describe, it, expect, beforeEach } from 'vitest'
import { isRateLimited } from '@/lib/rate-limit'

describe('isRateLimited', () => {
  beforeEach(() => {
    // Clear the global rate limit store between tests
    const store = globalThis.__peepalRateLimitStore
    if (store) store.clear()
  })

  it('allows first request', () => {
    expect(isRateLimited('test-key-1', 5, 60_000)).toBe(false)
  })

  it('allows requests up to the limit', () => {
    const key = 'test-key-2'
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key, 5, 60_000)).toBe(false)
    }
  })

  it('blocks requests exceeding the limit', () => {
    const key = 'test-key-3'
    for (let i = 0; i < 10; i++) {
      isRateLimited(key, 10, 60_000)
    }
    expect(isRateLimited(key, 10, 60_000)).toBe(true)
  })

  it('uses separate buckets for different keys', () => {
    for (let i = 0; i < 3; i++) {
      isRateLimited('key-a', 3, 60_000)
    }
    // key-a should be blocked, key-b should be allowed
    expect(isRateLimited('key-a', 3, 60_000)).toBe(true)
    expect(isRateLimited('key-b', 3, 60_000)).toBe(false)
  })

  it('defaults to 10 limit and 60s window', () => {
    const key = 'test-defaults'
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited(key)).toBe(false)
    }
    expect(isRateLimited(key)).toBe(true)
  })
})
