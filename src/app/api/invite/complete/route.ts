import { NextResponse, type NextRequest } from 'next/server'
import { getClientIp, isRateLimited } from '@/lib/rate-limit'
import { createPatientSchema } from '@/lib/validations/patient'
import { completeInvite } from '@/actions/invites'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (isRateLimited(`invite-complete:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { token, ...patientFields } = body as { token?: string; [key: string]: unknown }

  if (!token || typeof token !== 'string' || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const parsed = createPatientSchema.safeParse(patientFields)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const result = await completeInvite(token, parsed.data)

  if (result.error) {
    const statusCode = result.error.includes('expired') ? 410 :
      result.error.includes('already been used') ? 409 : 400
    return NextResponse.json({ error: result.error }, { status: statusCode })
  }

  return NextResponse.json({ patientId: result.patientId }, { status: 201 })
}
