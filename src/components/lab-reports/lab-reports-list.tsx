'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FlaskConical,
  Link2,
  Trash2,
  MoreHorizontal,
  Clock,
  FileText,
  Activity,
  Upload,
  User,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, copyToClipboard } from '@/lib/utils'
import { deleteLabReport, generateSecureUploadToken } from '@/actions/lab-reports'
import type { Tables } from '@/types/database'

interface LabReportsListProps {
  reports: (Tables<'lab_reports'> & {
    patient?: { id: string; full_name: string; patient_code: string }
  })[]
  patientId?: string
  patientName?: string
  fetchError?: string | null
  hideTitle?: boolean
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  blood_test: 'Blood Test',
  thyroid_panel: 'Thyroid Panel',
  vitamin_panel: 'Vitamin Panel',
  lipid_profile: 'Lipid Profile',
  other: 'Other',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function LabReportsList({ reports, patientId, patientName, fetchError, hideTitle = false }: LabReportsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tokenLink, setTokenLink] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleDelete = (reportId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteLabReport(reportId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Report deleted')
        router.refresh()
      }
    })
  }

  const handleGenerateLink = () => {
    if (!patientId) {
      toast.error('No patient selected for secure link')
      return
    }
    startTransition(async () => {
      const result = await generateSecureUploadToken(patientId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      const link = `${window.location.origin}/lab-upload/${result.token}`
      setTokenLink(link)
      setTokenDialogOpen(true)
    })
  }

  const handleCopyLink = async () => {
    if (!tokenLink) return
    const copiedSuccessfully = await copyToClipboard(tokenLink)
    if (!copiedSuccessfully) {
      toast.error('Unable to copy link automatically. Please copy it manually.')
      return
    }

    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareWhatsApp = () => {
    if (!tokenLink) return
    const text = encodeURIComponent(
      `Please upload your lab report using this secure link:\n${tokenLink}\n\nThis link expires in 48 hours.`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const uploadHref = patientId
    ? `/patients/${patientId}/lab-reports/upload`
    : '/patients'

  const listSpacing = hideTitle ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-5'

  return (
    <div className={listSpacing}>
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card/95 p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {!hideTitle && (
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Lab Reports</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload, analyze, and manage lab reports for your patients.
              </p>
            </div>
          )}
          {hideTitle && <p className="text-sm font-medium text-muted-foreground">Lab Actions</p>}
          <div className="flex items-center gap-2">
            {patientId && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-xl"
                onClick={handleGenerateLink}
                disabled={isPending}
              >
                <Link2 className="h-4 w-4" />
                Request Report
              </Button>
            )}
            <Link
              href={uploadHref}
              className={cn(
                buttonVariants({ size: 'sm' }),
                'h-10 gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <Upload className="h-4 w-4" />
              Upload Report
            </Link>
          </div>
        </div>
      </div>

      {/* Secure link dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Upload Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this secure link with {patientName ?? 'the patient'} to upload their lab report. The link expires in 48 hours.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={tokenLink ?? ''}
                className="flex-1 h-9 rounded-md border bg-muted px-3 text-sm font-mono truncate"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleShareWhatsApp}>
                <ExternalLink className="h-3.5 w-3.5" />
                Share via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error state */}
      {fetchError && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/95 py-16 gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-xs text-muted-foreground">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={() => router.refresh()} className="mt-1">
            Try again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!fetchError && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 bg-card/95 py-16 gap-3 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FlaskConical className="h-7 w-7 opacity-40" />
          </div>
          <p className="text-sm font-medium">No lab reports found</p>
          <p className="text-xs">Start by uploading a lab report.</p>
          <Link
            href={uploadHref}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2 gap-2')}
          >
            <Upload className="h-4 w-4" />
            Upload Report
          </Link>
        </div>
      )}

      {/* Reports list */}
      {!fetchError && reports.length > 0 && (
        <div className="space-y-2.5">
          {reports.map((report) => (
            <div
              key={report.id}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border/40 bg-card/95 px-3 py-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => {
                const targetPatientId = patientId ?? report.patient?.id
                if (!targetPatientId) {
                  router.push('/patients')
                  return
                }
                router.push(`/patients/${targetPatientId}/lab-reports/${report.id}`)
              }}
            >
              {/* Icon */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-border/40">
                <FileText className="h-4 w-4" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{report.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {report.report_type && (
                    <Badge variant="secondary" className="text-xs font-normal capitalize">
                      {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {report.upload_source === 'patient' ? (
                      <>
                        <User className="h-3 w-3" /> Patient
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" /> Dietitian
                      </>
                    )}
                  </span>
                  {report.patient && !patientId && (
                    <span className="text-xs text-muted-foreground">
                      · {report.patient.full_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(report.created_at)}
                  </span>
                </div>
              </div>

              {/* AI badge */}
              {report.ai_summary && (
                <Badge variant="secondary" className="text-xs font-normal gap-1 shrink-0">
                  <Activity className="h-3 w-3" />
                  AI Analyzed
                </Badge>
              )}

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="rounded-md p-1.5 opacity-100 transition-colors hover:bg-muted sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      const targetPatientId = patientId ?? report.patient?.id
                      if (!targetPatientId) {
                        router.push('/patients')
                        return
                      }
                      router.push(`/patients/${targetPatientId}/lab-reports/${report.id}`)
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Report
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(report.id, report.title)
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
