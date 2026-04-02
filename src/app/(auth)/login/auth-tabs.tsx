'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { MaterialSymbol } from '@/components/ui/material-symbol'
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@/lib/validations/auth'
import { signIn, signUp } from '@/actions/auth'

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

function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginInput) => {
    startTransition(async () => {
      const result = await signIn(data.email, data.password, rememberDevice)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }

      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {errors.root && (
        <div className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Work Email
        </Label>
        <Input
          id="login-email"
          type="email"
          placeholder="dr.smith@clinic.com"
          autoComplete="email"
          className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
            <span className="lg:hidden">Security Key</span>
            <span className="hidden lg:inline">Password</span>
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-primary hover:underline hover:underline-offset-4"
          >
            Forgot Access?
          </Link>
        </div>

        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
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

        {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex items-center justify-between py-0 lg:hidden">
        <label htmlFor="remember-device" className="flex cursor-pointer items-center gap-2.5">
          <Checkbox
            id="remember-device"
            checked={rememberDevice}
            onCheckedChange={(checked) => setRememberDevice(checked === true)}
            className="h-[18px] w-[18px] rounded border-outline-variant data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <span className="text-sm font-medium text-on-surface-variant">Keep me logged in on this device</span>
        </label>
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white shadow-md hover:opacity-90"
        disabled={isPending}
      >
        {isPending ? (
          'Authenticating…'
        ) : (
          <>
            <span className="lg:hidden">Access Workspace</span>
            <span className="hidden lg:inline">Authenticate Portal</span>
          </>
        )}
        {!isPending && <MaterialSymbol name="arrow_forward" className="ml-1 text-xl" />}
      </Button>

      <div className="hidden lg:block">
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-outline-variant/50" />
          </div>
          <div className="relative flex justify-center text-xs font-bold uppercase tracking-[0.18em]">
            <span className="bg-white px-4 text-outline">OR</span>
          </div>
        </div>

        <button
          type="button"
          className="relative flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-secondary-container bg-secondary-container/40 text-sm font-bold text-on-surface-variant"
          disabled
        >
          <MaterialSymbol name="phone_iphone" className="text-lg" />
          Login with Phone OTP
          <span className="absolute -right-2 -top-2 rounded border border-tertiary-container/10 bg-tertiary-fixed px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-tertiary">
            Coming Soon
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-secondary-container/50 px-3 py-3 text-center lg:mt-8 lg:rounded-none lg:border-t lg:border-outline-variant lg:bg-transparent lg:px-0 lg:pt-6">
        <p className="text-sm text-on-surface-variant">
          <span className="lg:hidden">New to the platform?</span>
          <span className="hidden lg:inline">New to Strive Clinical?</span>
        </p>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="mt-3 h-11 w-full rounded-xl bg-secondary-container text-sm font-semibold text-primary"
        >
          <span className="lg:hidden">Request Institutional Access</span>
          <span className="hidden lg:inline">Register for Credentials</span>
        </button>
      </div>
    </form>
  )
}

function RegisterForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch('password', '')

  const onSubmit = (data: RegisterInput) => {
    startTransition(async () => {
      const result = await signUp(data.email, data.password, data.fullName)
      if (result?.error) {
        setError('root', { message: result.error })
        return
      }

      toast.success('Account created! Please verify your email.')
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {errors.root && (
        <div className="rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reg-name" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Full Name
        </Label>
        <Input
          id="reg-name"
          type="text"
          placeholder="Dr. Jane Smith"
          autoComplete="name"
          className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
          {...register('fullName')}
        />
        {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Work Email
        </Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="name@clinic.com"
          autoComplete="email"
          className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Password
        </Label>
        <div className="relative">
          <Input
            id="reg-password"
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
        <Label htmlFor="reg-confirm" className="ml-1 text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          Confirm Password
        </Label>
        <div className="relative">
          <Input
            id="reg-confirm"
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
        {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <div className="flex items-start gap-2.5">
        <Controller
          name="terms"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="terms"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5 h-[18px] w-[18px] rounded border-outline-variant data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
          )}
        />
        <Label htmlFor="terms" className="cursor-pointer text-sm font-normal leading-snug text-on-surface-variant">
          I agree to the{' '}
          <Link href="/terms" className="font-medium text-primary underline underline-offset-2">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-medium text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {errors.terms && <p className="-mt-2 text-xs text-destructive">{errors.terms.message}</p>}

      <Button
        type="submit"
        className="h-11 w-full rounded-lg bg-gradient-to-br from-primary to-primary-container text-sm font-bold text-white shadow-md hover:opacity-90"
        disabled={isPending}
      >
        {isPending ? 'Creating account…' : 'Create Dietitian Account'}
        {!isPending && <MaterialSymbol name="arrow_forward" className="ml-1 text-xl" />}
      </Button>
    </form>
  )
}

export function AuthTabs({
  initialTab = 'login',
  callbackError,
}: {
  initialTab?: string
  callbackError?: string
}) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    initialTab === 'register' ? 'register' : 'login'
  )
  const [dismissCallbackError, setDismissCallbackError] = useState(false)

  const showCallbackError = Boolean(callbackError && activeTab === 'login' && !dismissCallbackError)

  return (
    <div className="w-full">
      <header className="flex h-16 items-center justify-between bg-surface px-6 lg:hidden">
        <div className="flex items-center gap-3">
          <MaterialSymbol name="monitoring" className="text-primary" />
          <h1 className="font-headline text-lg font-extrabold tracking-tight text-primary">Strive Clinical</h1>
        </div>
      </header>

      <section className="relative overflow-hidden bg-tertiary px-8 py-6 text-center lg:hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url(https://lh3.googleusercontent.com/aida-public/AB6AXuAqur9usBGC7n7zHtFYIKphtEJYRZFQE1p_eopzJvV2rBoljv8_uO5ZgufOfEXKNLx1AVtBS0Chk4JNn1Y1PjcOMZy70_DsCxyEZOoTuxtXPr6M4TzHPBtampAGfe4a1IhyNRJmto6ndcXXeJ6W0NpDY_qk-BE1_-g1q7pqebMGG_aY38yIkSKjGoDA5Rqm4-CI9KDYgumTVWFz3z3Pv9pwK_eAbHRzNzr0s6Ts6Wn2_98QSF6Hz8wAKqBT9aOOR3mNbXoGtYTXtA)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10 mx-auto max-w-[290px]">
          <h2 className="font-headline text-2xl font-extrabold leading-tight tracking-tight text-white">
            Empowering Clinical Excellence
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-tertiary-fixed">
            The professional tool for modern clinical research and seamless data management.
          </p>

          <div className="mt-3 flex flex-row flex-wrap justify-center gap-2">
            <div className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
              <MaterialSymbol name="verified" className="text-sm text-tertiary-fixed" />
              HIPAA Compliant
            </div>
            <div className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
              <MaterialSymbol name="groups" className="text-sm text-tertiary-fixed" />
              Researcher Sync
            </div>
          </div>
        </div>
      </section>

      <main className="-mt-6 rounded-t-2xl bg-surface-container-low px-4 pb-28 pt-4 lg:mt-0 lg:rounded-none lg:px-0 lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-8">
            <div className="mb-8 hidden rounded-lg bg-surface-container p-1 lg:flex">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'register' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Register
              </button>
            </div>

            <div className="mb-3 lg:hidden">
              <h3 className="font-headline text-2xl font-bold text-on-surface">
                {activeTab === 'login' ? 'Welcome Back' : 'Create Credentials'}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {activeTab === 'login'
                  ? 'Sign in to your clinical workspace'
                  : 'Set up your Strive Clinical account in a few steps.'}
              </p>
            </div>

            {showCallbackError && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
                <p>{callbackError}</p>
                <button
                  type="button"
                  onClick={() => setDismissCallbackError(true)}
                  className="mt-0.5 text-destructive transition-colors hover:text-destructive"
                  aria-label="Dismiss error"
                >
                  <MaterialSymbol name="close" className="text-lg" />
                </button>
              </div>
            )}

            {activeTab === 'login' ? (
              <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
            ) : (
              <RegisterForm />
            )}
          </div>

          <footer className="mt-10 hidden items-center justify-between gap-4 sm:flex">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline">
              © 2024 Clinical Precision Systems.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline hover:text-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline hover:text-primary">
                Terms of Service
              </Link>
            </div>
          </footer>

          <footer className="mt-4 flex flex-col items-center gap-2 sm:hidden">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-medium uppercase tracking-[0.15em] text-outline">
              <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <a href="#" className="hover:text-primary">Help Center</a>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              <span className="text-tertiary-container">●</span>
              System Status: All Services Operational
            </p>
          </footer>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center border-t border-outline-variant bg-white/90 px-4 pb-6 pt-2 backdrop-blur-xl lg:hidden">
        <div className="grid w-full max-w-[220px] grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`inline-flex flex-col items-center justify-center rounded-full px-6 py-1 text-xs font-medium uppercase tracking-wider transition-transform ${
              activeTab === 'login' ? 'bg-secondary-container text-primary' : 'text-on-surface-variant'
            }`}
          >
            <MaterialSymbol name="login" className="text-lg" />
            Login
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`inline-flex flex-col items-center justify-center rounded-full px-6 py-1 text-xs font-medium uppercase tracking-wider transition-transform ${
              activeTab === 'register' ? 'bg-secondary-container text-primary' : 'text-on-surface-variant'
            }`}
          >
            <MaterialSymbol name="person_add" className="text-lg" />
            Register
          </button>
        </div>
      </nav>
    </div>
  )
}
