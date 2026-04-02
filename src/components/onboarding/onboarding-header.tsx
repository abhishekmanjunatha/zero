import { Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { step: 1, label: 'Basic Profile' },
  { step: 2, label: 'Professional' },
  { step: 3, label: 'Clinic & Practice' },
  { step: 4, label: 'Availability' },
]

interface OnboardingHeaderProps {
  currentStep: 1 | 2 | 3 | 4
  title: string
  description: string
}

export function OnboardingHeader({ currentStep, title, description }: OnboardingHeaderProps) {
  const progress = (currentStep / 4) * 100

  return (
    <div className="mb-8 space-y-6 sm:space-y-7">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-sm">
          <Leaf className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-semibold tracking-tight sm:text-2xl">Strive</span>
      </div>

      {/* Progress */}
      <div className="space-y-4 rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Step {currentStep} of 4
          </span>
          <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {STEPS.map((s) => {
            const isCompleted = s.step < currentStep
            const isCurrent = s.step === currentStep
            return (
              <div key={s.step} className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ease-out',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15',
                      !isCompleted && !isCurrent && 'border-border bg-muted/50 text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.step
                    )}
                  </div>

                  {s.step < STEPS.length && (
                    <div
                      className={cn(
                        'ml-2 h-0.5 flex-1 rounded-full transition-all duration-300 ease-out',
                        isCompleted ? 'bg-primary/70' : 'bg-border'
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'block text-[10px] leading-tight sm:text-xs font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Title + description */}
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
    </div>
  )
}
