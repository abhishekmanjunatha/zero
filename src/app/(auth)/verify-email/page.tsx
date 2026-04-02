import type { Metadata } from 'next'
import { VerifyEmailContent } from './verify-email-content'

export const metadata: Metadata = { title: 'Verify Email — Strive' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  return <VerifyEmailContent email={email} />
}
