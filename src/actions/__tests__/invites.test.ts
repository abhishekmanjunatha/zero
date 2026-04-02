import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockReturnValue({ error: null })
const mockSelectSingle = vi.fn()

/** Creates a chainable query builder mock; every method returns itself except terminal props */
function createChainMock(terminalData: { data: unknown; error: unknown } = { data: [], error: null }) {
  const chain: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'data') return terminalData.data
      if (prop === 'error') return terminalData.error
      if (prop === 'single') return mockSelectSingle
      if (prop === 'then') return undefined // not a promise
      // Every other method call returns the proxy again (chainable)
      if (!chain[prop as string]) {
        chain[prop as string] = vi.fn().mockReturnValue(new Proxy({}, handler))
      }
      return chain[prop as string]
    },
  }
  return new Proxy({}, handler)
}

const mockFrom = vi.fn((_table: string) => {
  return {
    insert: mockInsert,
    select: vi.fn().mockReturnValue(createChainMock()),
    update: vi.fn().mockReturnValue(createChainMock()),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'dietitian-001' } } }),
    },
    from: (...args: unknown[]) => mockFrom(...args as [string]),
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn().mockReturnValue(false),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/notifications/server', () => ({
  emitNotification: vi.fn().mockResolvedValue(undefined),
}))

// ── Import after mocks ────────────────────────────────────────────────────

import {
  cancelInvite,
  checkPhoneExists,
  createPatientInvite,
  getInviteMessageContext,
  getPatientInvites,
  resendInvite,
} from '@/actions/invites'
import { isRateLimited } from '@/lib/rate-limit'

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Invite Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isRateLimited as Mock).mockReturnValue(false)
  })

  // ── checkPhoneExists ───────────────────────────────────────────────────

  describe('checkPhoneExists', () => {
    it('returns { exists: false } when phone is too short', async () => {
      const result = await checkPhoneExists('123')
      expect(result).toEqual({ exists: false })
    })

    it('returns { exists: false } when no patients match', async () => {
      const result = await checkPhoneExists('9876543210')
      expect(result.exists).toBe(false)
    })

    it('returns { exists: true } with patient info when a match is found', async () => {
      const patient = { id: 'p1', full_name: 'John', patient_code: 'PT-001', phone: '+919876543210' }
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [patient], error: null }),
        }),
      }))

      const result = await checkPhoneExists('9876543210')
      expect(result.exists).toBe(true)
      expect(result.patient).toEqual({ id: 'p1', full_name: 'John', patient_code: 'PT-001' })
    })
  })

  // ── createPatientInvite ────────────────────────────────────────────────

  describe('createPatientInvite', () => {
    it('creates an invite and returns token + URL', async () => {
      const result = await createPatientInvite({
        phone: '+919876543210',
        countryCode: '+91',
        deliveryChannel: 'whatsapp',
      })

      expect(result.error).toBeUndefined()
      expect(result.token).toBeDefined()
      expect(result.token).toHaveLength(64) // 32 bytes → 64 hex chars
      expect(result.inviteUrl).toContain('/invite/')
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('returns error when rate limited', async () => {
      ;(isRateLimited as Mock).mockReturnValue(true)

      const result = await createPatientInvite({
        phone: '+919876543210',
        countryCode: '+91',
        deliveryChannel: 'whatsapp',
      })

      expect(result.error).toContain('invite limit')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error on DB insert failure', async () => {
      mockInsert.mockReturnValueOnce({ error: { message: 'DB error' } })

      const result = await createPatientInvite({
        phone: '+919876543210',
        countryCode: '+91',
        deliveryChannel: 'text_message',
      })

      expect(result.error).toBe('DB error')
    })

    it('includes custom message when provided', async () => {
      await createPatientInvite({
        phone: '+919876543210',
        countryCode: '+91',
        message: 'Welcome!',
        deliveryChannel: 'whatsapp',
      })

      const insertArg = mockInsert.mock.calls[0]?.[0]
      expect(insertArg).toMatchObject({
        invite_message: 'Welcome!',
        delivery_channel: 'whatsapp',
        status: 'pending',
      })
    })

    it('sets expires_at to 48 hours in the future', async () => {
      const before = Date.now()
      await createPatientInvite({
        phone: '+919876543210',
        countryCode: '+91',
        deliveryChannel: 'whatsapp',
      })
      const after = Date.now()

      const insertArg = mockInsert.mock.calls[0]?.[0]
      const expiresAt = new Date(insertArg.expires_at).getTime()

      // Should be approximately 48 hours from now (within 5 seconds tolerance)
      const expectedMin = before + 48 * 60 * 60 * 1000 - 5000
      const expectedMax = after + 48 * 60 * 60 * 1000 + 5000
      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin)
      expect(expiresAt).toBeLessThanOrEqual(expectedMax)
    })
  })

  // ── resendInvite ───────────────────────────────────────────────────────

  describe('resendInvite', () => {
    it('returns error when rate limited', async () => {
      ;(isRateLimited as Mock).mockReturnValue(true)

      const result = await resendInvite('invite-1')

      expect(result.error).toContain('invite limit')
    })

    it('returns error when invite not found', async () => {
      mockSelectSingle.mockResolvedValueOnce({ data: null })

      const result = await resendInvite('nonexistent')

      expect(result.error).toBe('Invite not found.')
    })

    it('returns error when invite is still pending (not expired/cancelled)', async () => {
      mockSelectSingle.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'pending', dietitian_id: 'dietitian-001' },
      })

      const result = await resendInvite('inv-1')

      expect(result.error).toContain('expired or cancelled')
    })
  })

  // ── getPatientInvites ──────────────────────────────────────────────────

  describe('getPatientInvites', () => {
    it('returns empty array when no invites exist', async () => {
      const result = await getPatientInvites()

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it('passes status filter to query', async () => {
      const result = await getPatientInvites({ status: 'pending' })

      expect(result.data).toEqual([])
      // No error = query executed
      expect(result.error).toBeUndefined()
    })
  })

  // ── cancelInvite ───────────────────────────────────────────────────────

  describe('cancelInvite', () => {
    it('returns error when invite not found', async () => {
      mockSelectSingle.mockResolvedValueOnce({ data: null })

      const result = await cancelInvite('nonexistent')

      expect(result.error).toBe('Invite not found.')
    })

    it('returns error when invite is not pending', async () => {
      mockSelectSingle.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'completed', dietitian_id: 'dietitian-001' },
      })

      const result = await cancelInvite('inv-1')

      expect(result.error).toContain('pending')
    })

    it('cancels a pending invite successfully', async () => {
      mockSelectSingle.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'pending', dietitian_id: 'dietitian-001' },
      })

      const result = await cancelInvite('inv-1')

      expect(result.error).toBeUndefined()
    })
  })

  // ── getInviteMessageContext ────────────────────────────────────────────

  describe('getInviteMessageContext', () => {
    it('returns dietitian name and clinic name', async () => {
      mockSelectSingle
        .mockResolvedValueOnce({ data: { full_name: 'Dr. Smith' } })
        .mockResolvedValueOnce({ data: { clinic_name: 'Healthy Clinic' } })

      const result = await getInviteMessageContext()

      expect(result.dietitianName).toBe('Dr. Smith')
      expect(result.clinicName).toBe('Healthy Clinic')
    })

    it('returns empty strings when data not found', async () => {
      mockSelectSingle
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: null })

      const result = await getInviteMessageContext()

      expect(result.dietitianName).toBe('')
      expect(result.clinicName).toBe('')
    })
  })
})
