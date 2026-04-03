'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Activity,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Download,
  Trash2,
  User,
  Clock,
  Upload,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatLabel } from '@/lib/utils'
import { REPORT_TYPE_LABELS } from '@/lib/constants/labels'
import { deleteLabReport, saveAiAnalysis } from '@/actions/lab-reports'
import { ManualMetricsForm } from '@/components/lab-reports/manual-metrics-form'
import { KeerthiAIIcon } from '@/components/shared/keerthi-ai-icon'
import type { Tables } from '@/types/database'

interface LabReportDetailProps {
  report: Tables<'lab_reports'> & {
    patient?: { id: string; full_name: string; patient_code: string }
  }
}

interface Metric {
  name: string
  value: string
  status: 'normal' | 'low' | 'high' | 'critical'
  reference?: string
  source?: 'ai' | 'manual'
}

interface Observation {
  type: 'concern' | 'improvement' | 'note'
  text: string
}

function parseStoredAiObservations(
  value: unknown
): { metrics: Metric[]; observations: Observation[] } {
  if (!value || typeof value !== 'object') {
    return { metrics: [], observations: [] }
  }

  const asObject = value as {
    metrics?: Metric[]
    observations?: Observation[]
  }

  if (Array.isArray(asObject.metrics) || Array.isArray(asObject.observations)) {
    return {
      metrics: Array.isArray(asObject.metrics) ? asObject.metrics : [],
      observations: Array.isArray(asObject.observations) ? asObject.observations : [],
    }
  }

  // Backward compatibility: legacy array-wrapped shape [{ metrics, observations }]
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0] as {
      metrics?: Metric[]
      observations?: Observation[]
    }
    return {
      metrics: Array.isArray(first?.metrics) ? first.metrics : [],
      observations: Array.isArray(first?.observations) ? first.observations : [],
    }
  }

  return { metrics: [], observations: [] }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_STYLES: Record<string, string> = {
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  low: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
}

const STATUS_ICONS: Record<string, typeof Minus> = {
  normal: Minus,
  low: TrendingDown,
  high: TrendingUp,
  critical: AlertTriangle,
}

export function LabReportDetail({ report }: LabReportDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMeta, setAiMeta] = useState<{ isFallback: boolean; reason?: string } | null>(null)

  // Parse existing AI data
  const [aiSummary, setAiSummary] = useState<string>(report.ai_summary ?? '')
  const [aiObservations, setAiObservations] = useState<{
    metrics: Metric[]
    observations: Observation[]
  }>(() => parseStoredAiObservations(report.ai_observations))

  const handleAnalyze = async () => {
    if (report.file_urls.length === 0) {
      toast.error('No files to analyze')
      return
    }

    setAiLoading(true)
    setAiMeta(null)
    try {
      const res = await fetch('/api/ai/analyze-lab-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          fileUrls: report.file_urls,
          ...(report.report_type ? { reportType: report.report_type } : {}),
        }),
      })

      const data = (await res.json()) as {
        summary?: string
        metrics?: Metric[]
        observations?: Observation[]
        error?: string
        _meta?: { isFallback: boolean; reason?: string }
      }

      if (!res.ok || data.error) {
        toast.error(data.error ?? 'AI analysis failed')
        return
      }

      setAiMeta(data._meta ?? null)
      setAiSummary(data.summary ?? '')
      setAiObservations({
        metrics: data.metrics ?? [],
        observations: data.observations ?? [],
      })

      // Save to DB — preserve manual metrics alongside AI metrics
      const manualMetrics = aiObservations.metrics.filter((m) => m.source === 'manual')
      const mergedMetrics = [...(data.metrics ?? []).map((m: Metric) => ({ ...m, source: 'ai' as const })), ...manualMetrics]
      await saveAiAnalysis(report.id, data.summary ?? '', {
        metrics: mergedMetrics,
        observations: data.observations ?? [],
      })
      // Update local state with merged
      setAiObservations((prev) => ({
        ...prev,
        metrics: mergedMetrics,
      }))
      toast.success('AI analysis complete')
    } catch {
      toast.error('Failed to analyze report')
    } finally {
      setAiLoading(false)
    }
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${report.title}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteLabReport(report.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Report deleted')
        router.push(`/patients/${report.patient_id}/lab-reports`)
      }
    })
  }

  return (
    <div className="app-page max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/patients/${report.patient_id}/lab-reports`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient
        </Link>
      </div>

      <div className="app-surface flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="app-title">{report.title}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {report.report_type && (
              <Badge variant="secondary" className="text-xs font-normal capitalize">
                {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {report.upload_source === 'patient' ? (
                <>
                  <User className="h-3 w-3" /> Uploaded by patient
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" /> Uploaded by dietitian
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(report.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Patient info */}
      {report.patient && (
        <Card className="rounded-2xl border border-border/40 bg-card/95 shadow-sm">
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{report.patient.full_name}</p>
              <p className="text-xs text-muted-foreground">{report.patient.patient_code}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files */}
      <Card className="rounded-2xl border border-border/40 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Files</CardTitle>
        </CardHeader>
        <CardContent>
          {report.file_urls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.file_urls.map((url, idx) => {
                const isPdf = url.toLowerCase().endsWith('.pdf')
                const isImage = /\.(jpg|jpeg|png)$/i.test(url)
                return (
                  <div key={idx} className="rounded-lg border overflow-hidden">
                    {isImage && (
                      <Image
                        src={url}
                        alt={`Report file ${idx + 1}`}
                        width={960}
                        height={720}
                        unoptimized
                        className="w-full h-48 object-contain bg-muted"
                      />
                    )}
                    {isPdf && (
                      <div className="flex items-center justify-center h-48 bg-muted">
                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        File {idx + 1} · {isPdf ? 'PDF' : 'Image'}
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className="rounded-2xl border border-border/40 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <KeerthiAIIcon className="h-4 w-4 text-violet-500" />
              Keerthi AI Analysis
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAnalyze}
              disabled={aiLoading || report.file_urls.length === 0}
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              {aiSummary ? 'Re-analyze' : 'Analyze with AI'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiSummary && !aiLoading && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <KeerthiAIIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p>Click &ldquo;Analyze with AI&rdquo; to extract metrics and get observations.</p>
              <p className="text-xs mt-1 italic">AI observation – not a medical diagnosis</p>
            </div>
          )}

          {aiLoading && (
            <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing report…
            </div>
          )}

          {aiSummary && (
            <>
              {/* AI fallback warning */}
              {aiMeta?.isFallback === true && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">
                      AI could not fully process this. Showing limited or fallback results.
                    </p>
                    {aiMeta.reason && ['timeout', 'parse_failed', 'invalid_structure'].includes(aiMeta.reason) && (
                      <p className="text-xs text-amber-700 mt-0.5 capitalize">
                        Reason: {formatLabel(aiMeta.reason)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={handleAnalyze}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Retry AI
                  </Button>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-4">
                <h3 className="text-sm font-semibold text-violet-800 mb-1">Summary</h3>
                <p className="text-sm text-violet-900">{aiSummary}</p>
              </div>

              {/* Metrics table */}
              {aiObservations.metrics.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Key Metrics</h3>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Metric</th>
                          <th className="text-left px-3 py-2 font-medium">Value</th>
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                          <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                            Reference
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {aiObservations.metrics.map((m, i) => {
                          const StatusIcon = STATUS_ICONS[m.status] ?? Minus
                          return (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium">
                                {m.name}
                                {m.source === 'manual' && (
                                  <span className="ml-1.5 inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Manual</span>
                                )}
                              </td>
                              <td className="px-3 py-2">{m.value}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                                    STATUS_STYLES[m.status] ?? ''
                                  )}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {m.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                                {m.reference ?? '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Observations */}
              {aiObservations.observations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Observations</h3>
                  <div className="space-y-2">
                    {aiObservations.observations.map((obs, i) => (
                      <div
                        key={i}
                        className={cn(
                          'rounded-lg border px-4 py-3 text-sm',
                          obs.type === 'concern'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : obs.type === 'improvement'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-muted/30 border-border'
                        )}
                      >
                        {obs.text}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic mt-2">
                    AI observation – not a medical diagnosis
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual Metrics Entry */}
      <Card className="rounded-2xl border border-border/40 bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            Manual Lab Metrics
          </CardTitle>
          <p className="text-xs text-muted-foreground">Enter metrics from physical lab reports. These are saved alongside AI-extracted data and feed into patient AI insights.</p>
        </CardHeader>
        <CardContent>
          <ManualMetricsForm
            reportId={report.id}
            existingManualMetrics={
              aiObservations.metrics
                .filter((m) => m.source === 'manual')
                .map((m) => ({
                  name: m.name,
                  value: m.value,
                  unit: '',
                  status: m.status,
                  reference: m.reference ?? '',
                }))
            }
            onSaved={(saved) => {
              setAiObservations((prev) => ({
                ...prev,
                metrics: [
                  ...prev.metrics.filter((m) => m.source !== 'manual'),
                  ...saved.map((m) => ({ ...m, source: 'manual' as const })),
                ],
              }))
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
