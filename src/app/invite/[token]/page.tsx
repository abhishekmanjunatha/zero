import type { Metadata } from 'next'
import { getInviteByToken } from '@/actions/invites'
import { InvitePatientForm } from '@/components/patients/invite-patient-form'

export const metadata: Metadata = { title: 'Join Patient Directory' }

export default async function InvitePage(props: {
  params: Promise<{ token: string }>
}) {
  const { token } = await props.params

  if (!token || token.length !== 64) {
    return <InviteErrorPage status="invalid" />
  }

  const result = await getInviteByToken(token)

  if (!result || !result.valid) {
    return <InviteErrorPage status={result?.status ?? 'invalid'} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <InvitePatientForm
          token={token}
          dietitianName={result.dietitianName!}
          phone={result.phone!}
          countryCode={result.countryCode!}
        />
      </div>
    </div>
  )
}

function InviteErrorPage({ status }: { status: string }) {
  const config = {
    expired: {
      title: 'Link Expired',
      message: 'This invite link has expired. Please ask your dietitian to send a new one.',
      emoji: '⏰',
    },
    completed: {
      title: 'Already Completed',
      message: 'This invite has already been used. Your profile has been created.',
      emoji: '✅',
    },
    invalid: {
      title: 'Invalid Link',
      message: 'This invite link is not valid. Please check the link or ask your dietitian for a new one.',
      emoji: '🔗',
    },
  }

  const { title, message, emoji } = config[status as keyof typeof config] ?? config.invalid

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-5xl">{emoji}</div>
        <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
