'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MaterialSymbol } from '@/components/ui/material-symbol'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations/auth'
import { updatePassword } from '@/actions/auth'

function PasswordStrengthHints({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', ok: /[a-z]/.test(password) },
    { label: 'One number (0-9)', ok: /[0-9]/.test(password) },
  ]

  return (
    <div className="mt-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5">
      <div className="space-y-1.5">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5 text-xs">
            {check.ok ? (
              <MaterialSymbol name="check_circle" filled className="text-sm text-tertiary-container" />
            ) : (
              <MaterialSymbol name="radio_button_unchecked" className="text-sm text-outline" />
            )}
            <span className={check.ok ? 'text-tertiary-container' : 'text-outline'}>{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch('password', '')

  const onSubmit = (data: ResetPasswordInput) => {
    startTransition(async () => {
      const result = await updatePassword(data.password)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }

      toast.success('Password updated successfully!')
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-white p-8 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Set New Password</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Create a secure password to protect your clinical workspace.
            </p>
          </div>

          {errors.root && (
            <div className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              New Password
            </Label>

            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create password"
                autoComplete="new-password"
                className="h-11 rounded-lg border-none bg-surface-container-high px-4 pr-10 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant transition-colors hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <MaterialSymbol name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
              </button>
            </div>

            <PasswordStrengthHints password={passwordValue} />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Confirm Password
            </Label>

            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="h-11 rounded-lg border-none bg-surface-container-high px-4 pr-10 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant transition-colors hover:text-primary"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <MaterialSymbol name={showConfirm ? 'visibility_off' : 'visibility'} className="text-xl" />
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="h-11 w-full rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white shadow-md hover:opacity-90"
            disabled={isPending}
          >
            {isPending ? 'Updating password…' : 'Update Password'}
            {!isPending && <MaterialSymbol name="arrow_forward" className="ml-1 text-xl" />}
          </Button>

          <p className="text-center text-sm text-on-surface-variant">
            Back to{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline hover:underline-offset-2">
              Login
            </Link>
          </p>
        </form>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.15em] text-outline">
        <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
      </div>
    </div>
  )
}

