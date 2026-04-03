'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialSymbol } from '@/components/ui/material-symbol'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations/auth'
import { resetPassword } from '@/actions/auth'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = (data: ForgotPasswordInput) => {
    startTransition(async () => {
      const result = await resetPassword(data.email)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }
      setSent(true)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-white p-8 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-10">
        {sent ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tertiary-fixed/30">
                <MaterialSymbol name="check_circle" filled className="text-[30px] text-tertiary-container" />
              </div>
            </div>
            <div>
              <h1 className="font-headline text-2xl font-bold text-on-surface">Check your inbox</h1>
              <p className="mt-2 text-sm text-on-surface-variant">
                We sent a password reset link to{' '}
                <span className="font-semibold text-on-surface">{getValues('email')}</span>.
              </p>
            </div>
            <Link href="/login" className="block">
              <Button variant="outline" className="h-11 w-full rounded-lg border-outline-variant text-primary">
                <MaterialSymbol name="arrow_back" className="mr-1 text-lg" />
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h1 className="font-headline text-2xl font-bold text-on-surface">Forgot Password?</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Enter your registered email and we will send a secure reset link.
              </p>
            </div>

            {errors.root && (
              <div className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fpw-email" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                Work Email
              </Label>
              <Input
                id="fpw-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white shadow-md hover:opacity-90"
              disabled={isPending}
            >
              {isPending ? 'Sending link…' : 'Send Reset Link'}
              {!isPending && <MaterialSymbol name="arrow_forward" className="ml-1 text-xl" />}
            </Button>

            <p className="text-center text-sm text-on-surface-variant">
              Remember your password?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline hover:underline-offset-2">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.15em] text-outline">
        <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
      </div>
    </div>
  )
}

