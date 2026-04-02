import { NextResponse, type NextRequest } from 'next/server'
import { getClientIp, isRateLimited } from '@/lib/rate-limit'
import { getInviteByToken } from '@/actions/invites'

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (isRateLimited(`invite-validate:${ip}`, 15, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const token = request.nextUrl.searchParams.get('token')?.trim()
  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const result = await getInviteByToken(token)

  if (!result) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (!result.valid) {
    const statusCode =
      result.status === 'expired' ? 410 :
      result.status === 'completed' ? 409 :
      400
    return NextResponse.json({ error: result.status }, { status: statusCode })
  }

  return NextResponse.json({
    dietitianName: result.dietitianName,
    phone: result.phone,
    countryCode: result.countryCode,
  })
}
