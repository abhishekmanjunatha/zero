'use client'

import { cn } from '@/lib/utils'
import type { CombinedScore } from '@/types/ai'

interface AIScoreDisplayProps {
  score: CombinedScore
  compact?: boolean
  className?: string
}

function getScoreColor(value: number): string {
  if (value <= 40) return 'text-red-500'
  if (value <= 60) return 'text-amber-500'
  if (value <= 80) return 'text-emerald-500'
  return 'text-emerald-600'
}

function getScoreBarColor(value: number): string {
  if (value <= 40) return 'bg-red-400'
  if (value <= 60) return 'bg-amber-400'
  if (value <= 80) return 'bg-emerald-400'
  return 'bg-emerald-500'
}

function getScoreLabel(value: number): string {
  if (value <= 30) return 'Needs Attention'
  if (value <= 50) return 'Fair'
  if (value <= 70) return 'Good'
  if (value <= 85) return 'Very Good'
  return 'Excellent'
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-on-surface-variant">{label}</span>
        <span className={cn('font-bold', getScoreColor(value))}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-container-high">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', getScoreBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function AIScoreDisplay({ score, compact, className }: AIScoreDisplayProps) {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex flex-col items-center">
          <span className={cn('text-2xl font-black', getScoreColor(score.overall))}>
            {score.overall}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {getScoreLabel(score.overall)}
          </span>
        </div>
        <div className="flex-1 space-y-1.5">
          <ScoreBar label="Health" value={score.healthProgress} />
          <ScoreBar label="Engagement" value={score.engagement} />
          <ScoreBar label="Lab Trends" value={score.labTrends} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-surface-container-high"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${(score.overall / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              className={getScoreColor(score.overall)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-lg font-black leading-none', getScoreColor(score.overall))}>
              {score.overall}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant">
              Score
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-on-surface">{getScoreLabel(score.overall)}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Combined health progress, engagement, and lab trends
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        <ScoreBar label="Health Progress" value={score.healthProgress} />
        <ScoreBar label="Engagement" value={score.engagement} />
        <ScoreBar label="Lab Trends" value={score.labTrends} />
      </div>
    </div>
  )
}
