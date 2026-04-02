import { z } from 'zod'

export const createInviteSchema = z.object({
  phone: z.string().min(7, 'Enter a valid phone number'),
  countryCode: z.string().min(1, 'Country code is required'),
  message: z.string().max(500, 'Message must be 500 characters or fewer').optional(),
  deliveryChannel: z.enum(['whatsapp', 'text_message', 'sms']),
})

export type CreateInviteInput = z.infer<typeof createInviteSchema>
