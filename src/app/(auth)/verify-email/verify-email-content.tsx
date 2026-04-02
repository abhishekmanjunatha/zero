'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MaterialSymbol } from '@/components/ui/material-symbol'
import { createClient } from '@/lib/supabase/client'
import { resendVerificationEmail } from '@/actions/auth'

const RESEND_COOLDOWN = 30

export function VerifyEmailContent({ email }: { email?: string }) {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [isContinuing, setIsContinuing] = useState(false)

  // Poll every 4s to detect email confirmation
  useEffect(() => {
    const supabase = createClient()

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) setIsVerified(true)
    }

    check()
    const interval = setInterval(check, 4000)
    return () => clearInterval(interval)
  }, [])

  // Countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return
    setIsResending(true)
    const result = await resendVerificationEmail(email)
    setIsResending(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Verification email resent!')
      setCooldown(RESEND_COOLDOWN)
    }
  }

  const handleContinue = () => {
    setIsContinuing(true)
    router.push('/onboarding')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-white p-8 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-10">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                isVerified ? 'bg-tertiary-fixed/20' : 'bg-secondary-container/40'
              }`}
            >
              <MaterialSymbol
                name={isVerified ? 'check_circle' : 'mail'}
                filled={isVerified}
                className={`text-[30px] ${isVerified ? 'text-tertiary-container' : 'text-primary'}`}
              />
            </div>
          </div>

          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Verify Your Email</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              We sent a verification link to your registered email address. Verify it to activate your Strive access.
            </p>
          </div>

          {email && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-outline">
              Verification email sent to{' '}
              <span className="font-semibold text-on-surface">{email}</span>
            </div>
          )}
        </div>

        <div
          className={`mt-5 flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm ${
            isVerified ? 'bg-tertiary-fixed/20 text-tertiary-container' : 'bg-surface-container-low text-outline'
          }`}
        >
          {isVerified ? (
            <MaterialSymbol name="check_circle" filled className="text-lg" />
          ) : (
            <MaterialSymbol name="progress_activity" className="animate-spin text-lg" />
          )}
          <span>{isVerified ? 'Email successfully verified' : 'Waiting for email verification...'}</span>
        </div>

        <Button
          className="mt-5 h-11 w-full rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white shadow-md hover:opacity-90"
          disabled={!isVerified || isContinuing}
          onClick={handleContinue}
        >
          {isContinuing ? (
            <>
              <MaterialSymbol name="progress_activity" className="mr-2 animate-spin text-lg" />
              Redirecting...
            </>
          ) : (
            <>
              Continue to Onboarding
              <MaterialSymbol name="arrow_forward" className="ml-1 text-xl" />
            </>
          )}
        </Button>

        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-outline hover:text-primary"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending || !email}
          >
            {isResending ? (
              <>
                <MaterialSymbol name="progress_activity" className="mr-1.5 animate-spin text-base" />
                Sending...
              </>
            ) : cooldown > 0 ? (
              <>
                <MaterialSymbol name="schedule" className="mr-1.5 text-base" />
                Resend in {cooldown}s
              </>
            ) : (
              <>
                <MaterialSymbol name="refresh" className="mr-1.5 text-base" />
                Resend Verification Email
              </>
            )}
          </Button>
        </div>

        <p className="mt-1 text-center text-sm text-outline">
          Wrong email?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline hover:underline-offset-2">
            Go back and edit
          </Link>
        </p>

        <div className="mt-5 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-outline">Did not receive the email?</p>
          <ul className="mt-2 space-y-1.5 text-xs text-outline">
            <li className="flex items-center gap-1.5">
              <MaterialSymbol name="check_circle" filled className="text-sm text-tertiary-container" />
              Check your spam or junk folder
            </li>
            <li className="flex items-center gap-1.5">
              <MaterialSymbol name="check_circle" filled className="text-sm text-tertiary-container" />
              Confirm the email address was entered correctly
            </li>
            <li className="flex items-center gap-1.5">
              <MaterialSymbol name="check_circle" filled className="text-sm text-tertiary-container" />
              Wait a minute before requesting a new verification link
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.15em] text-outline">
        <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
      </div>
    </div>
  )
}
