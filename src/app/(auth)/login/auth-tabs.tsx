'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  CheckCircle2,
  Circle,
  Smartphone,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-tertiary-container" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-outline" />
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
          placeholder="you@example.com"
          autoComplete="email"
          className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm font-medium text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/30"
          {...register('email')}
        />
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-[0.12em] text-on-surface-variant">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-bold text-primary hover:underline hover:underline-offset-4"
          >
            Forgot Password?
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
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        {isPending ? 'Signing in…' : 'Sign In'}
        {!isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
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
          className="relative flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low text-sm font-bold text-on-surface-variant/60"
          disabled
        >
          <Smartphone className="h-4 w-4" />
          Login with Phone OTP
          <span className="absolute -right-2 -top-2 rounded border border-outline-variant/20 bg-surface-container-high px-2 py-0.5 text-[10px] font-black uppercase tracking-tight text-on-surface-variant">
            Coming Soon
          </span>
        </button>
      </div>

      <div className="rounded-xl bg-secondary-container/50 px-3 py-3 text-center lg:mt-8 lg:rounded-none lg:border-t lg:border-outline-variant lg:bg-transparent lg:px-0 lg:pt-6">
        <p className="text-sm text-on-surface-variant">New to Strive Clinical?</p>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="mt-3 h-11 w-full rounded-xl bg-secondary-container text-sm font-semibold text-primary"
        >
          Create Account
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
          placeholder="Your full name"
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
          placeholder="you@example.com"
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
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
        {!isPending && <ArrowRight className="ml-1.5 h-4 w-4" />}
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
      {/* Mobile header */}
      <header className="flex h-14 items-center gap-2.5 bg-surface px-5 lg:hidden">
        <Activity className="h-5 w-5 text-primary" />
        <h1 className="font-headline text-lg font-extrabold tracking-tight text-primary">Strive Clinical</h1>
      </header>

      {/* Mobile hero */}
      <section className="bg-primary px-6 py-8 text-center lg:hidden">
        <h2 className="font-headline text-2xl font-extrabold leading-tight tracking-tight text-white">
          Empowering Clinical Excellence
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          The professional tool for modern clinical practice management.
        </p>
        <div className="mt-4 flex flex-row flex-wrap justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            HIPAA Compliant
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
            <Users className="h-3.5 w-3.5" />
            Researcher Sync
          </div>
        </div>
      </section>

      <main className="-mt-4 rounded-t-2xl bg-surface-container-low px-4 pb-10 pt-4 lg:mt-0 lg:rounded-none lg:px-0 lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] sm:p-8">

            {/* Tab switcher — shown on both mobile and desktop */}
            <div className="mb-6 rounded-lg bg-surface-container p-1">
              <div className="grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'register' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-headline text-xl font-bold text-on-surface">
                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {activeTab === 'login'
                  ? 'Sign in to your clinical workspace'
                  : 'Set up your Strive Clinical account'}
              </p>
            </div>

            {showCallbackError && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-error-container bg-error-container px-3 py-2 text-sm text-destructive">
                <p>{callbackError}</p>
                <button
                  type="button"
                  onClick={() => setDismissCallbackError(true)}
                  className="mt-0.5 shrink-0 text-destructive transition-colors hover:text-destructive"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {activeTab === 'login' ? (
              <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
            ) : (
              <RegisterForm />
            )}
          </div>

          <footer className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1">
            <Link href="/terms" className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline hover:text-primary">
              Privacy Policy
            </Link>
            <a href="#" className="text-[10px] font-medium uppercase tracking-[0.15em] text-outline hover:text-primary">
              Help Center
            </a>
          </footer>
        </div>
      </main>
    </div>
  )
}
