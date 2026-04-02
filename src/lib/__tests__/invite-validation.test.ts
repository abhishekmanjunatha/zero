import { describe, it, expect } from 'vitest'
import { createInviteSchema } from '@/lib/validations/invite'

describe('createInviteSchema', () => {
  it('accepts a valid invite input', () => {
    const result = createInviteSchema.safeParse({
      phone: '9876543210',
      countryCode: '+91',
      deliveryChannel: 'whatsapp',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid input with optional message', () => {
    const result = createInviteSchema.safeParse({
      phone: '9876543210',
      countryCode: '+91',
      message: 'Please join my practice',
      deliveryChannel: 'text_message',
    })
    expect(result.success).toBe(true)
  })

  it('rejects phone shorter than 7 characters', () => {
    const result = createInviteSchema.safeParse({
      phone: '123',
      countryCode: '+91',
      deliveryChannel: 'whatsapp',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty country code', () => {
    const result = createInviteSchema.safeParse({
      phone: '9876543210',
      countryCode: '',
      deliveryChannel: 'whatsapp',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid delivery channel', () => {
    const result = createInviteSchema.safeParse({
      phone: '9876543210',
      countryCode: '+91',
      deliveryChannel: 'email',
    })
    expect(result.success).toBe(false)
  })

  it('rejects message longer than 500 characters', () => {
    const result = createInviteSchema.safeParse({
      phone: '9876543210',
      countryCode: '+91',
      message: 'x'.repeat(501),
      deliveryChannel: 'whatsapp',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all three valid delivery channels', () => {
    for (const channel of ['whatsapp', 'text_message', 'sms']) {
      const result = createInviteSchema.safeParse({
        phone: '9876543210',
        countryCode: '+91',
        deliveryChannel: channel,
      })
      expect(result.success).toBe(true)
    }
  })
})
