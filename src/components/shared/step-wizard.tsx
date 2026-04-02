'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface StepConfig {
  label: string
}

/* ── Standalone progress indicator (reusable without StepWizard wrapper) ── */

interface StepProgressProps {
  steps: StepConfig[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className={cn('space-y-4 rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5', className)}>
      <div className="flex items-center">
        <span className="text-xs font-medium text-on-surface-variant">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className={cn('grid gap-1.5 sm:gap-3')} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep
          return (
            <div key={s.label} className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300 ease-out',
                    isCompleted && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/15',
                    !isCompleted && !isCurrent && 'border-border/70 bg-surface-container-high text-on-surface-variant/80'
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
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
                  isCurrent ? 'text-foreground' : isCompleted ? 'text-primary/80' : 'text-on-surface-variant/70'
                )}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-center text-xs text-on-surface-variant">{Math.round(progress)}% complete</p>
    </div>
  )
}

/* ── Full StepWizard wrapper ── */

interface StepWizardProps {
  steps: StepConfig[]
  currentStep: number
  onNext?: () => void
  onBack?: () => void
  canAdvance?: boolean
  isSubmitting?: boolean
  submitLabel?: string
  children: React.ReactNode
  className?: string
}

export function StepWizard({
  steps,
  currentStep,
  onNext,
  onBack,
  canAdvance = true,
  isSubmitting = false,
  submitLabel = 'Save',
  children,
  className,
}: StepWizardProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  return (
    <div className={cn('space-y-6', className)}>
      <StepProgress steps={steps} currentStep={currentStep} />

      {/* Step content */}
      <div>{children}</div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isFirst || isSubmitting}
          className={cn(isFirst && 'invisible')}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        {isLast ? (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canAdvance || isSubmitting}
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canAdvance || isSubmitting}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
