'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  CalendarDays,
  TrendingUp,
  Lightbulb,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AIScoreDisplay } from './ai-score-display'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type {
  InsightType,
  JourneySummaryResponse,
  LastVisitSummaryResponse,
  PatientExperienceResponse,
} from '@/types/ai'

interface AIInsightsSheetProps {
  patientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type InsightState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; type: 'journey'; data: JourneySummaryResponse; isFallback: boolean }
  | { status: 'success'; type: 'last_visit'; data: LastVisitSummaryResponse; isFallback: boolean }
  | { status: 'success'; type: 'experience'; data: PatientExperienceResponse; isFallback: boolean }

const INSIGHT_OPTIONS = [
  {
    type: 'journey' as InsightType,
    label: 'Journey Summary',
    description: 'Complete story from day 1 to today',
    icon: Sparkles,
    enabled: true,
  },
  {
    type: 'last_visit' as InsightType,
    label: 'Last Visit',
    description: 'What happened at last consultation',
    icon: CalendarDays,
    enabled: true,
  },
  {
    type: 'experience' as InsightType,
    label: 'Patient Experience',
    description: 'Progress, engagement & insights',
    icon: TrendingUp,
    enabled: true,
  },
]

export function AIInsightsSheet({ patientId, open, onOpenChange }: AIInsightsSheetProps) {
  const isMobile = useIsMobile()
  const [selectedType, setSelectedType] = useState<InsightType | null>(null)
  const [insightState, setInsightState] = useState<InsightState>({ status: 'idle' })

  const fetchInsight = useCallback(
    async (type: InsightType) => {
      setSelectedType(type)
      setInsightState({ status: 'loading' })

      try {
        const res = await fetch('/api/ai/patient-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId, insightType: type }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          const message = errorData.error ?? 'Failed to generate insight. Please try again.'
          setInsightState({ status: 'error', message })
          return
        }

        const result = await res.json()

        if (result.error) {
          setInsightState({ status: 'error', message: result.error })
          return
        }

        setInsightState({
          status: 'success',
          type,
          data: result.data,
          isFallback: result._meta?.isFallback ?? false,
        })
      } catch {
        setInsightState({
          status: 'error',
          message: 'Network error. Please check your connection and try again.',
        })
      }
    },
    [patientId]
  )

  const handleBack = () => {
    setSelectedType(null)
    setInsightState({ status: 'idle' })
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedType(null)
      setInsightState({ status: 'idle' })
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          isMobile
            ? 'max-h-[85vh] rounded-t-3xl'
            : 'w-full sm:max-w-md'
        )}
        showCloseButton={!selectedType}
      >
        {/* Drag handle for mobile */}
        {isMobile && (
          <div className="flex justify-center pb-2 pt-2">
            <div className="h-1.5 w-12 rounded-full bg-outline-variant/50" />
          </div>
        )}

        <SheetHeader className={cn(selectedType && 'flex-row items-center gap-2')}>
          {selectedType && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <SheetTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            {selectedType
              ? INSIGHT_OPTIONS.find((o) => o.type === selectedType)?.label ?? 'AI Insight'
              : 'AI Insights'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className={cn('flex-1 px-4 pb-4', isMobile ? 'max-h-[70vh]' : 'h-[calc(100vh-80px)]')}>
          {!selectedType ? (
            <InsightMenu options={INSIGHT_OPTIONS} onSelect={fetchInsight} />
          ) : insightState.status === 'loading' ? (
            <LoadingSkeleton type={selectedType} />
          ) : insightState.status === 'error' ? (
            <ErrorState
              message={insightState.message}
              onRetry={() => fetchInsight(selectedType)}
            />
          ) : insightState.status === 'success' ? (
            <InsightContent
              state={insightState}
              onRefresh={() => fetchInsight(selectedType)}
            />
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

// ── Menu ────────────────────────────────────────────────────────────────────

function InsightMenu({
  options,
  onSelect,
}: {
  options: typeof INSIGHT_OPTIONS
  onSelect: (type: InsightType) => void
}) {
  return (
    <div className="space-y-3 py-2">
      <p className="text-xs text-on-surface-variant">
        Select an insight type to generate an AI-powered summary for this patient.
      </p>
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.type}
            type="button"
            disabled={!option.enabled}
            onClick={() => onSelect(option.type)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border border-outline-variant p-4 text-left transition-all',
              option.enabled
                ? 'hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary-container/20 hover:shadow-sm active:scale-[0.99]'
                : 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface">{option.label}</p>
              <p className="text-xs text-on-surface-variant">{option.description}</p>
            </div>
            {!option.enabled && (
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                Coming Soon
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Loading Skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton({ type }: { type: InsightType }) {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-semibold text-primary">Generating insights…</p>
          <p className="text-xs text-on-surface-variant">Analyzing patient data with AI</p>
        </div>
      </div>
      {/* Skeleton blocks */}
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-xl bg-surface-container-low" />
        <div className="h-32 animate-pulse rounded-xl bg-surface-container-low" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-container-low" />
        {type === 'journey' && (
          <div className="h-24 animate-pulse rounded-xl bg-surface-container-low" />
        )}
      </div>
    </div>
  )
}

// ── Error State ─────────────────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-on-surface-variant">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  )
}

// ── Insight Content Router ──────────────────────────────────────────────────

function InsightContent({
  state,
  onRefresh,
}: {
  state: Extract<InsightState, { status: 'success' }>
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4 py-2">
      {state.isFallback && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>AI analysis was partially completed. Some data may be limited.</span>
        </div>
      )}

      {state.type === 'journey' && <JourneyContent data={state.data} />}
      {state.type === 'last_visit' && <LastVisitContent data={state.data} />}
      {state.type === 'experience' && <ExperienceContent data={state.data} />}

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </button>
      </div>
    </div>
  )
}

// ── Journey Summary Content ─────────────────────────────────────────────────

function JourneyContent({ data }: { data: JourneySummaryResponse }) {
  return (
    <>
      {/* Overview */}
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Journey Overview</h4>
        <p className="mt-2 text-sm leading-relaxed text-on-surface">{data.journeyOverview}</p>
      </section>

      {/* Score */}
      <section className="rounded-2xl border border-outline-variant bg-white p-4">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Health Score</h4>
        <AIScoreDisplay score={data.combinedScore} />
      </section>

      {/* Milestones */}
      {data.keyMilestones.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Key Milestones</h4>
          <div className="relative space-y-0 pl-6">
            <div className="absolute bottom-0 left-2 top-0 w-px bg-outline-variant/60" />
            {data.keyMilestones.map((m, idx) => (
              <div key={idx} className="relative pb-3">
                <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">{m.date}</p>
                  <p className="text-sm font-semibold text-on-surface">{m.event}</p>
                  {m.significance && (
                    <p className="text-xs text-on-surface-variant">{m.significance}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Treatment Progression */}
      <section className="rounded-2xl border border-outline-variant bg-white p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Treatment Progression</h4>
        <p className="text-sm leading-relaxed text-on-surface">{data.treatmentProgression}</p>
      </section>

      {/* Lab Trends */}
      {data.labTrends && !data.labTrends.toLowerCase().includes('no lab data') && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Lab Trends</h4>
          <p className="text-sm leading-relaxed text-on-surface">{data.labTrends}</p>
        </section>
      )}

      {/* Current Status */}
      <section className="rounded-2xl bg-surface-container-low p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Current Status</h4>
        <p className="text-sm leading-relaxed text-on-surface">{data.currentStatus}</p>
      </section>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Recommendations</h4>
          <ul className="space-y-2">
            {data.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

// ── Last Visit Content ──────────────────────────────────────────────────────

function LastVisitContent({ data }: { data: LastVisitSummaryResponse }) {
  return (
    <>
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Last Visit</h4>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant">
            <Clock className="h-3 w-3" />
            {data.visitDate}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-on-surface">{data.purpose}</p>
        <p className="mt-2 text-sm leading-relaxed text-on-surface">{data.summary}</p>
      </section>

      {data.keyDecisions.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Key Decisions</h4>
          <ul className="space-y-2">
            {data.keyDecisions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.prescriptions.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Prescriptions & Plans</h4>
          <ul className="space-y-2">
            {data.prescriptions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded text-xs font-bold text-primary">
                  {idx + 1}.
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.labsReviewed && (
        <section className="rounded-2xl bg-surface-container-low p-4">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Labs Reviewed</h4>
          <p className="text-sm leading-relaxed text-on-surface">{data.labsReviewed}</p>
        </section>
      )}

      {data.nextSteps.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Next Steps</h4>
          <ul className="space-y-2">
            {data.nextSteps.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

// ── Patient Experience Content ──────────────────────────────────────────────

function ExperienceContent({ data }: { data: PatientExperienceResponse }) {
  const trajectoryColors = {
    improving: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    stable: 'bg-amber-100 text-amber-700 border-amber-200',
    declining: 'bg-red-100 text-red-700 border-red-200',
  }
  const engagementColors = {
    high: 'bg-emerald-100 text-emerald-700',
    moderate: 'bg-amber-100 text-amber-700',
    low: 'bg-red-100 text-red-700',
  }

  return (
    <>
      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold', trajectoryColors[data.progressTrajectory])}>
          <TrendingUp className="h-3.5 w-3.5" />
          {data.progressTrajectory.charAt(0).toUpperCase() + data.progressTrajectory.slice(1)}
        </span>
        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold', engagementColors[data.engagementLevel])}>
          Engagement: {data.engagementLevel.charAt(0).toUpperCase() + data.engagementLevel.slice(1)}
        </span>
      </div>

      {/* Interaction Summary */}
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Interaction Summary</h4>
        <p className="text-sm leading-relaxed text-on-surface">{data.interactionSummary}</p>
      </section>

      {/* Positives */}
      {data.positives.length > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-700">What&apos;s Working</h4>
          <ul className="space-y-2">
            {data.positives.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Concerns */}
      {data.concerns.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-700">Areas of Concern</h4>
          <ul className="space-y-2">
            {data.concerns.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Suggestions */}
      {data.improvementSuggestions.length > 0 && (
        <section className="rounded-2xl border border-outline-variant bg-white p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Suggestions for Improvement</h4>
          <ul className="space-y-2">
            {data.improvementSuggestions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-on-surface">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
