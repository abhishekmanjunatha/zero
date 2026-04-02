import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  isRateLimited: vi.fn().mockReturnValue(false),
}))

vi.mock('@/actions/invites', () => ({
  getInviteByToken: vi.fn(),
  completeInvite: vi.fn(),
}))

vi.mock('@/lib/validations/patient', () => ({
  createPatientSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { full_name: 'Test User', phone: '+919876543210' },
    }),
  },
}))

import { isRateLimited } from '@/lib/rate-limit'
import { getInviteByToken, completeInvite } from '@/actions/invites'
import { createPatientSchema } from '@/lib/validations/patient'

// ── Helper to create NextRequest-like objects ─────────────────────────────

function createGetRequest(params: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/invite/validate')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return {
    headers: { get: vi.fn().mockReturnValue(null) },
    nextUrl: url,
  } as unknown
}

function createPostRequest(body: unknown) {
  return {
    headers: { get: vi.fn().mockReturnValue(null) },
    json: vi.fn().mockResolvedValue(body),
  } as unknown
}

// ── Validate Route Tests ──────────────────────────────────────────────────

describe('GET /api/invite/validate', () => {
  let GET: (req: unknown) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(isRateLimited as Mock).mockReturnValue(false)
    // Dynamic import to get fresh module with mocks applied
    const mod = await import('@/app/api/invite/validate/route')
    GET = mod.GET as (req: unknown) => Promise<Response>
  })

  it('returns 429 when rate limited', async () => {
    ;(isRateLimited as Mock).mockReturnValue(true)
    const req = createGetRequest({ token: 'a'.repeat(64) })
    const res = await GET(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 for missing token', async () => {
    const req = createGetRequest({})
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for token with wrong length', async () => {
    const req = createGetRequest({ token: 'short' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 503 when getInviteByToken returns null', async () => {
    ;(getInviteByToken as Mock).mockResolvedValue(null)
    const req = createGetRequest({ token: 'a'.repeat(64) })
    const res = await GET(req)
    expect(res.status).toBe(503)
  })

  it('returns 410 for expired invite', async () => {
    ;(getInviteByToken as Mock).mockResolvedValue({ valid: false, status: 'expired' })
    const req = createGetRequest({ token: 'a'.repeat(64) })
    const res = await GET(req)
    expect(res.status).toBe(410)
  })

  it('returns 409 for completed invite', async () => {
    ;(getInviteByToken as Mock).mockResolvedValue({ valid: false, status: 'completed' })
    const req = createGetRequest({ token: 'a'.repeat(64) })
    const res = await GET(req)
    expect(res.status).toBe(409)
  })

  it('returns 200 with dietitian info for valid token', async () => {
    ;(getInviteByToken as Mock).mockResolvedValue({
      valid: true,
      dietitianName: 'Dr. Smith',
      phone: '9876543210',
      countryCode: '+91',
    })
    const req = createGetRequest({ token: 'a'.repeat(64) })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.dietitianName).toBe('Dr. Smith')
    expect(json.phone).toBe('9876543210')
  })
})

// ── Complete Route Tests ──────────────────────────────────────────────────

describe('POST /api/invite/complete', () => {
  let POST: (req: unknown) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(isRateLimited as Mock).mockReturnValue(false)
    const mod = await import('@/app/api/invite/complete/route')
    POST = mod.POST as (req: unknown) => Promise<Response>
  })

  it('returns 429 when rate limited', async () => {
    ;(isRateLimited as Mock).mockReturnValue(true)
    const req = createPostRequest({ token: 'a'.repeat(64) })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 for missing token', async () => {
    const req = createPostRequest({ full_name: 'Test' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for short token', async () => {
    const req = createPostRequest({ token: 'abc' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 422 for invalid patient data', async () => {
    ;(createPatientSchema.safeParse as Mock).mockReturnValueOnce({
      success: false,
      error: { flatten: () => ({ fieldErrors: { full_name: ['Required'] } }) },
    })
    const req = createPostRequest({ token: 'a'.repeat(64) })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('returns 201 on successful completion', async () => {
    ;(completeInvite as Mock).mockResolvedValue({ patientId: 'new-patient-1' })
    const req = createPostRequest({
      token: 'a'.repeat(64),
      full_name: 'Test User',
      phone: '+919876543210',
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.patientId).toBe('new-patient-1')
  })

  it('returns 410 for expired invite error', async () => {
    ;(completeInvite as Mock).mockResolvedValue({ error: 'This invite link has expired.' })
    const req = createPostRequest({
      token: 'a'.repeat(64),
      full_name: 'Test User',
      phone: '+919876543210',
    })
    const res = await POST(req)
    expect(res.status).toBe(410)
  })

  it('returns 409 for already-used invite', async () => {
    ;(completeInvite as Mock).mockResolvedValue({ error: 'This invite link has already been used.' })
    const req = createPostRequest({
      token: 'a'.repeat(64),
      full_name: 'Test User',
      phone: '+919876543210',
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
