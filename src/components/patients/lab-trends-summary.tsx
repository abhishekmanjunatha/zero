'use client'

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import type { Tables } from '@/types/database'
import { REPORT_TYPE_LABELS } from '@/lib/constants/labels'
import { formatLabel } from '@/lib/utils'

interface Metric {
  name: string
  value: string
  status: 'normal' | 'low' | 'high' | 'critical'
  unit?: string
  reference?: string
  source?: 'ai' | 'manual'
}

interface ParsedReportMetrics {
  reportType: string
  reportDate: string
  metrics: Metric[]
}

function parseAiObservations(value: unknown): Metric[] {
  if (!value || typeof value !== 'object') return []

  const obj = value as { metrics?: unknown[] }
  const raw = Array.isArray(obj.metrics)
    ? obj.metrics
    : Array.isArray(value) && (value as unknown[])[0] && typeof (value as unknown[])[0] === 'object'
      ? ((value as unknown[])[0] as { metrics?: unknown[] }).metrics ?? []
      : []

  if (!Array.isArray(raw)) return []

  return raw.filter(
    (m): m is Metric =>
      typeof m === 'object' &&
      m !== null &&
      typeof (m as Metric).name === 'string' &&
      typeof (m as Metric).value === 'string' &&
      ['normal', 'low', 'high', 'critical'].includes((m as Metric).status)
  )
}



const STATUS_COLOR: Record<string, string> = {
  normal: 'bg-emerald-500',
  low: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const STATUS_TEXT: Record<string, string> = {
  normal: 'text-emerald-700',
  low: 'text-amber-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  normal: Minus,
  low: TrendingDown,
  high: TrendingUp,
  critical: AlertTriangle,
}

export function LabTrendsSummary({
  labReports,
  variant = 'sidebar',
}: {
  labReports: Tables<'lab_reports'>[]
  variant?: 'sidebar' | 'mobile'
}) {
  const parsed: ParsedReportMetrics[] = labReports
    .filter((r) => r.ai_observations)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((r) => ({
      reportType: r.report_type ?? 'other',
      reportDate: r.created_at,
      metrics: parseAiObservations(r.ai_observations),
    }))
    .filter((p) => p.metrics.length > 0)

  if (parsed.length === 0) {
    return (
      <p className="text-xs font-medium text-on-surface-variant">
        {labReports.length === 0
          ? 'No lab reports uploaded yet'
          : 'No analyzed metrics yet — run AI analysis on a lab report'}
      </p>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className="space-y-3">
        {parsed.map((report, ri) => (
          <div key={ri}>
            <p className="text-xs font-bold text-on-surface-variant mb-1.5">
              {REPORT_TYPE_LABELS[report.reportType as keyof typeof REPORT_TYPE_LABELS] ?? formatLabel(report.reportType)}
              <span className="ml-1.5 font-normal">
                · {new Date(report.reportDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </p>
            <div className="space-y-1.5">
              {report.metrics.slice(0, 4).map((m, mi) => {
                const Icon = STATUS_ICON[m.status] ?? Minus
                return (
                  <div key={mi} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-on-surface">{m.name}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-on-surface-variant">{m.value}</span>
                      <Icon className={`h-3 w-3 ${STATUS_TEXT[m.status] ?? ''}`} />
                      <span className={`h-2 w-2 rounded-full ${STATUS_COLOR[m.status] ?? 'bg-gray-400'}`} />
                    </span>
                  </div>
                )
              })}
              {report.metrics.length > 4 && (
                <p className="text-[10px] text-on-surface-variant">+{report.metrics.length - 4} more metrics</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Sidebar variant: compact grouped by report type
  return (
    <div className="space-y-2.5">
      {parsed.map((report, ri) => {
        const normalCount = report.metrics.filter((m) => m.status === 'normal').length
        const flaggedCount = report.metrics.length - normalCount
        return (
          <div key={ri}>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>{REPORT_TYPE_LABELS[report.reportType as keyof typeof REPORT_TYPE_LABELS] ?? formatLabel(report.reportType)}</span>
              <span className="flex items-center gap-1.5">
                {flaggedCount > 0 && (
                  <span className="text-orange-600">{flaggedCount} flagged</span>
                )}
                {flaggedCount === 0 && (
                  <span className="text-emerald-600">All normal</span>
                )}
              </span>
            </div>
            <div className="flex gap-1">
              {report.metrics.slice(0, 8).map((m, mi) => (
                <span
                  key={mi}
                  title={`${m.name}: ${m.value} (${m.status})`}
                  className={`h-2 flex-1 rounded-full ${STATUS_COLOR[m.status] ?? 'bg-gray-300'}`}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
