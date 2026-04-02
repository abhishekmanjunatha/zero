import type { Metadata } from 'next'
import { AuthTabs } from './auth-tabs'

export const metadata: Metadata = { title: 'Login — Strive' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>
}) {
  const { tab, error } = await searchParams
  const callbackError =
    error === 'auth_callback_failed'
      ? 'We could not verify your sign-in link. Please try signing in again.'
      : undefined

  return (
    <AuthTabs
      initialTab={tab === 'register' ? 'register' : 'login'}
      callbackError={callbackError}
    />
  )
}
