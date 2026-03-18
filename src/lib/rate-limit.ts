import type { NextRequest } from 'next/server'

type Bucket = {
  count: number
  resetAt: number
}

type Store = Map<string, Bucket>

declare global {
  var __peepalRateLimitStore: Store | undefined
}

const RATE_LIMIT_STORE: Store = globalThis.__peepalRateLimitStore ?? new Map<string, Bucket>()

if (!globalThis.__peepalRateLimitStore) {
  globalThis.__peepalRateLimitStore = RATE_LIMIT_STORE
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}

export function isRateLimited(
  key: string,
  limit = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now()
  const bucket = RATE_LIMIT_STORE.get(key)

  if (!bucket || now >= bucket.resetAt) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (bucket.count >= limit) {
    return true
  }

  bucket.count += 1
  RATE_LIMIT_STORE.set(key, bucket)
  return false
}
