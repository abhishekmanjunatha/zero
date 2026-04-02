'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  Copy,
  FlaskConical,
  FileText,
  Activity,
  Clock,
  CalendarDays,
  ClipboardList,
  TestTubeDiagonal,
  UserCheck,
  UserX,
  Play,
  Ban,
  CheckCircle2,
  Loader2,
  Pencil,
  Pill,
  Sparkles,
  TriangleAlert,
  TrendingUp,
  Upload,
  User,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { generateSecureUploadToken } from '@/actions/lab-reports'
import { getAppointmentStatusMeta } from '@/lib/constants/appointment-status'
import { cn, copyToClipboard } from '@/lib/utils'
import type { Tables } from '@/types/database'
import type { JourneySummaryResponse } from '@/types/ai'
import { AIScoreDisplay } from '@/components/shared/ai-score-display'
import { AIInsightsFab } from '@/components/shared/ai-insights-fab'
import { KeerthiAIIcon } from '@/components/shared/keerthi-ai-icon'
import { LabTrendsSummary } from '@/components/patients/lab-trends-summary'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getTimelineGroupLabel(dateStr: string | null) {
  if (!dateStr) return 'Older'
  const eventDate = new Date(dateStr)
  const now = new Date()
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((today.getTime() - eventDay.getTime()) / 86400000)

  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 7) return 'Last Week'
  return 'Older'
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  highly_active: 'Highly Active',
}

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-Vegetarian',
  vegan: 'Vegan',
  eggitarian: 'Eggitarian',
}

const WORK_LABELS: Record<string, string> = {
  desk_job: 'Desk Job',
  field_work: 'Field Work',
  other: 'Other',
}

const PURPOSE_LABELS: Record<string, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  blood_test: 'Blood Test',
  thyroid_panel: 'Thyroid Panel',
  vitamin_panel: 'Vitamin Panel',
  lipid_profile: 'Lipid Profile',
  other: 'Other',
}

const TIMELINE_ICONS: Record<
  Tables<'timeline_events'>['event_type'],
  React.ElementType
> = {
  appointment_created: CalendarDays,
  appointment_checked_in: UserCheck,
  appointment_in_progress: Play,
  appointment_completed: CheckCircle2,
  appointment_cancelled: Ban,
  appointment_no_show: UserX,
  clinical_document_created: ClipboardList,
  lab_report_uploaded: TestTubeDiagonal,
  weight_updated: Activity,
  note_added: FileText,
}

// ── Info Row helper ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 px-2 py-1.5 sm:px-3 sm:py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline/70">{label}</p>
      <div className="mt-1 min-w-0 break-words text-sm font-semibold leading-snug text-on-surface">{value ?? '—'}</div>
    </div>
  )
}

function SummaryField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-outline/80">{label}</p>
      <div className="text-sm font-bold leading-snug text-on-surface">{value ?? '—'}</div>
    </div>
  )
}

function getStatusBadgeClass(status: string) {
  if (status === 'upcoming') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'checked_in') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (status === 'in_progress') return 'border-primary/30 bg-primary/10 text-primary'
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'cancelled') return 'border-destructive/30 bg-destructive/10 text-destructive'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function getStatusLeftBorder(status: string) {
  if (status === 'upcoming') return 'border-l-blue-400'
  if (status === 'checked_in') return 'border-l-indigo-400'
  if (status === 'in_progress') return 'border-l-primary'
  if (status === 'completed') return 'border-l-emerald-400'
  if (status === 'cancelled') return 'border-l-destructive/60'
  return 'border-l-amber-400'
}

function getTimelineThemeClasses(eventType: string) {
  if (eventType.includes('cancelled') || eventType.includes('no_show')) {
    return {
      dotClassName: 'border-destructive/20 bg-destructive/5 text-destructive',
      cardClassName: 'border-destructive/15 bg-destructive/3',
    }
  }

  if (eventType.includes('completed') || eventType.includes('checked_in')) {
    return {
      dotClassName: 'border-tertiary-fixed/30 bg-tertiary-fixed/20 text-tertiary',
      cardClassName: 'border-tertiary-fixed/20 bg-tertiary-fixed/10',
    }
  }

  if (eventType.includes('lab') || eventType.includes('clinical')) {
    return {
      dotClassName: 'border-secondary-container bg-secondary-container/40 text-primary',
      cardClassName: 'border-secondary-container bg-secondary-container/20',
    }
  }

  return {
    dotClassName: 'border-secondary-container bg-secondary-container/40 text-primary',
    cardClassName: 'border-secondary-container bg-secondary-container/20',
  }
}

// ── Props ─────────────────────────────────────────────────────────────────

interface PatientProfileTabsProps {
  patient: Tables<'patients'>
  appointments: Tables<'appointments'>[]
  clinicalNotes: Tables<'clinical_notes'>[]
  labReports: Tables<'lab_reports'>[]
  timeline: Tables<'timeline_events'>[]
  initialTab?: 'summary' | 'health' | 'appointments' | 'notes' | 'labs' | 'timeline'
}

// ── Component ─────────────────────────────────────────────────────────────

export function PatientProfileTabs({
  patient,
  appointments,
  clinicalNotes,
  labReports,
  timeline,
  initialTab,
}: PatientProfileTabsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tokenLink, setTokenLink] = useState<string | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [aiInsight, setAiInsight] = useState<JourneySummaryResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const age = calcAge(patient.date_of_birth)

  const generateInsight = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/patient-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, insightType: 'journey' }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setAiError(result.error ?? 'Failed to generate insights.')
        return
      }
      setAiInsight(result.data as JourneySummaryResponse)
    } catch {
      setAiError('Network error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }, [patient.id])

  const defaultTab =
    initialTab && ['summary', 'health', 'appointments', 'notes', 'labs', 'timeline'].includes(initialTab)
      ? initialTab
      : 'summary'

  const tabTriggerClass =
    'inline-flex h-auto items-center gap-2 rounded-none border-0 border-b-[3px] border-b-transparent bg-transparent px-3 py-3 text-sm font-semibold text-on-surface-variant shadow-none transition-colors hover:text-primary/80 data-active:border-b-primary data-active:bg-transparent data-active:text-primary data-active:font-bold data-active:shadow-none after:hidden'

  const groupedTimeline = timeline.reduce(
    (groups, event) => {
      const label = getTimelineGroupLabel(event.created_at)
      const currentGroup = groups.find((group) => group.label === label)
      if (currentGroup) {
        currentGroup.events.push(event)
      } else {
        groups.push({ label, events: [event] })
      }
      return groups
    },
    [] as Array<{ label: string; events: Tables<'timeline_events'>[] }>
  )

  const nextReview = appointments
    .map((appt) => ({
      ...appt,
      when: new Date(`${appt.appointment_date}T${appt.appointment_time}`),
    }))
    .filter(
      (appt) =>
        appt.when >= new Date() &&
        appt.status !== 'completed' &&
        appt.status !== 'cancelled' &&
        appt.status !== 'no_show'
    )
    .sort((a, b) => a.when.getTime() - b.when.getTime())[0]

  const insightSummary = aiInsight
    ? aiInsight.currentStatus
    : null

  const handleGenerateReportLink = () => {
    startTransition(async () => {
      const result = await generateSecureUploadToken(patient.id)
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

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4 sm:space-y-6">
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Report Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Share this secure link with {patient.full_name} to upload a report. The link expires in 48 hours.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={tokenLink ?? ''}
                className="h-9 flex-1 rounded-md border border-outline-variant bg-surface-container-low px-3 text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-outline-variant px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-container-low active:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto border-b border-outline-variant pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList
          variant="line"
          className="h-auto w-max min-w-full flex-nowrap justify-start gap-2 rounded-none bg-transparent p-0"
        >
          <TabsTrigger
            value="summary"
            className={tabTriggerClass}
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="health"
            className={tabTriggerClass}
          >
            Health Info
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className={tabTriggerClass}
          >
            Appointments
            {appointments.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-bold leading-none text-primary">
                {appointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className={tabTriggerClass}
          >
            Clinical Notes
            {clinicalNotes.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-bold leading-none text-primary">
                {clinicalNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="labs"
            className={tabTriggerClass}
          >
            Lab Reports
            {labReports.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-bold leading-none text-primary">
                {labReports.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className={tabTriggerClass}
          >
            Timeline
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── Section 1: Patient Summary ─────────────────────────── */}
      <TabsContent value="summary" className="mt-0">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div className="space-y-3">
            <section className="rounded-2xl border border-outline-variant bg-white p-4 shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
              <h3 className="text-sm font-extrabold text-primary">Core Demographics</h3>
              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <SummaryField label="Full Name" value={patient.full_name} />
                <SummaryField label="Patient ID" value={patient.patient_code} />
                <SummaryField label="Phone Number" value={patient.phone} />
                <SummaryField
                  label="Age / Gender"
                  value={
                    age !== null || patient.gender
                      ? `${age !== null ? `${age} y` : '—'}${patient.gender ? ` / ${patient.gender.charAt(0).toUpperCase()}${patient.gender.slice(1).replace('_', ' ')}` : ''}`
                      : null
                  }
                />
                <SummaryField
                  label="Height / Weight"
                  value={`${patient.height_cm ? `${patient.height_cm} cm` : '—'} / ${patient.weight_kg ? `${patient.weight_kg} kg` : '—'}`}
                />
                <SummaryField
                  label="Primary Goal"
                  value={
                    patient.primary_goal ? (
                      <span className="inline-flex rounded-full bg-tertiary-fixed/30 px-3 py-0.5 text-xs font-bold text-tertiary">
                        {GOAL_LABELS[patient.primary_goal] ?? patient.primary_goal}
                      </span>
                    ) : (
                      'Not set'
                    )
                  }
                />
                <SummaryField label="Last Visit" value={formatDate(patient.last_visit_at)} />
                <SummaryField label="Patient Since" value={formatDate(patient.created_at)} />
              </div>
            </section>

            <section className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 text-white shadow-[0_18px_30px_-18px_rgba(4,43,73,0.85)]">
              <p className="inline-flex items-center gap-2 text-sm font-extrabold tracking-wide">
                <KeerthiAIIcon className="h-4 w-4" />
                Keerthi AI Insight
              </p>

              {aiInsight ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{insightSummary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Health Score</p>
                      <p className="mt-1 text-xl font-black text-white">{aiInsight.combinedScore.overall}<span className="text-sm font-bold text-white/60">/100</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Next Review</p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {nextReview
                          ? `${formatDate(nextReview.appointment_date)} · ${formatTime(nextReview.appointment_time)}`
                          : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                </>
              ) : aiLoading ? (
                <div className="mt-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-white/70" />
                  <p className="text-sm text-white/70">Generating Keerthi AI insights…</p>
                </div>
              ) : aiError ? (
                <div className="mt-2">
                  <p className="text-sm text-white/70">{aiError}</p>
                  <button
                    type="button"
                    onClick={generateInsight}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/30"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-white/70">Generate a Keerthi AI health score and clinical insights for this patient.</p>
                  <button
                    type="button"
                    onClick={generateInsight}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/30"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Keerthi AI Insights
                  </button>
                </div>
              )}
            </section>

            {/* Mobile-only: Allergies, Conditions, Lab Trends */}
            <div className="space-y-3 lg:hidden">
              <CollapsibleSection
                title="Allergies"
                subtitle="Food allergies & intolerances"
                count={patient.food_allergies?.length ?? 0}
                className="rounded-2xl border border-outline-variant bg-white shadow-sm"
                triggerClassName="text-primary"
                contentClassName="border-outline-variant"
              >
                {patient.food_allergies?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.food_allergies.map((a) => (
                      <span key={a} className="rounded-md bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No allergies recorded.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Medical Conditions"
                subtitle="Active diagnoses"
                count={patient.medical_conditions?.length ?? 0}
                className="rounded-2xl border border-outline-variant bg-white shadow-sm"
                triggerClassName="text-primary"
                contentClassName="border-outline-variant"
              >
                {patient.medical_conditions?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.medical_conditions.map((c) => (
                      <Badge key={c} variant="secondary" className="border-0 bg-surface-container-high font-semibold text-xs text-primary">{c}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">No medical conditions recorded.</p>
                )}
              </CollapsibleSection>

              <CollapsibleSection
                title="Recent Lab Trends"
                subtitle="Metrics from analyzed reports"
                count={labReports.filter((r) => r.ai_observations).length}
                className="rounded-2xl border border-outline-variant bg-white shadow-sm"
                triggerClassName="text-primary"
                contentClassName="border-outline-variant"
              >
                <LabTrendsSummary labReports={labReports} variant="mobile" />
              </CollapsibleSection>
            </div>
          </div>

          <div className="hidden space-y-3 lg:block">
            <section className="rounded-2xl border border-outline-variant bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-primary">Allergies</h4>
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {patient.food_allergies?.length ? (
                  patient.food_allergies.slice(0, 8).map((allergy) => (
                    <span key={allergy} className="rounded-md bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                      {allergy}
                    </span>
                  ))
                ) : (
                  <p className="text-xs font-medium text-on-surface-variant">No allergies recorded</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-outline-variant bg-white p-4">
              <h4 className="text-sm font-extrabold text-primary">Medical Conditions (Active)</h4>
              <div className="mt-2.5 space-y-2">
                {patient.medical_conditions?.length ? (
                  patient.medical_conditions.slice(0, 3).map((condition) => (
                    <div key={condition} className="flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2">
                      <div className="inline-flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary-container text-primary">
                          <Pill className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-semibold text-on-surface">{condition}</span>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-on-surface-variant" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-medium text-on-surface-variant">No active medical conditions listed</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-outline-variant bg-white p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-primary">Recent Lab Trends</h4>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2.5">
                <LabTrendsSummary labReports={labReports} variant="sidebar" />
              </div>
            </section>
          </div>
        </div>
      </TabsContent>

      {/* ── Section 2: Health Information ──────────────────────── */}
      <TabsContent value="health" className="mt-0">
        <div className="space-y-4">
          <div className="rounded-2xl border border-outline-variant bg-white p-4 shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
              <InfoRow
                label="Activity Level"
                value={patient.activity_level ? ACTIVITY_LABELS[patient.activity_level] : null}
              />
              <InfoRow
                label="Sleep Hours"
                value={patient.sleep_hours ? `${patient.sleep_hours} hrs/night` : null}
              />
              <InfoRow
                label="Work Type"
                value={patient.work_type ? WORK_LABELS[patient.work_type] : null}
              />
              <InfoRow
                label="Dietary Type"
                value={patient.dietary_type ? DIETARY_LABELS[patient.dietary_type] : null}
              />
            </div>
          </div>

          <CollapsibleSection
            title="Medical Conditions"
            subtitle="Long-term history and current diagnoses"
            count={patient.medical_conditions?.length ?? 0}
            defaultOpen={(patient.medical_conditions?.length ?? 0) > 0}
            className="rounded-2xl border border-outline-variant bg-white shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]"
            triggerClassName="text-primary"
            contentClassName="border-outline-variant"
          >
            {patient.medical_conditions?.length ? (
              <div className="flex flex-wrap gap-2">
                {patient.medical_conditions.map((c) => (
                  <Badge key={c} variant="secondary" className="border-0 bg-surface-container-high font-semibold text-xs text-primary">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No medical conditions recorded.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Food Allergies"
            subtitle="Critical intolerance and allergy references"
            count={patient.food_allergies?.length ?? 0}
            className="rounded-2xl border border-outline-variant bg-white shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]"
            triggerClassName="text-primary"
            contentClassName="border-outline-variant"
          >
            {patient.food_allergies?.length ? (
              <div className="flex flex-wrap gap-2">
                {patient.food_allergies.map((a) => (
                  <Badge key={a} variant="secondary" className="border-0 bg-destructive/10 font-semibold text-xs text-destructive">
                    {a}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">No allergies recorded.</p>
            )}
          </CollapsibleSection>
        </div>
      </TabsContent>

      {/* ── Section 3: Appointment History ─────────────────────── */}
      <TabsContent value="appointments" className="mt-0">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-on-surface-variant">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-outline">
                <CalendarDays className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No appointments yet</p>
              <Link
                href={`/appointments/new?patient=${patient.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2 border-outline-variant text-primary')}
              >
                <CalendarPlus className="h-4 w-4" />
                Create Appointment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {appointments.map((appt) => {
                const status = getAppointmentStatusMeta(appt.status)
                return (
                  <div
                    key={appt.id}
                    className={cn(
                      'flex items-center justify-between gap-4 border-l-[3px] px-4 py-3',
                      getStatusLeftBorder(appt.status)
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-on-surface">
                          {appt.purpose === 'custom' && appt.custom_purpose
                            ? appt.custom_purpose
                            : PURPOSE_LABELS[appt.purpose]}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            getStatusBadgeClass(appt.status)
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-outline/70">
                        {formatDate(appt.appointment_date)} · {formatTime(appt.appointment_time)} ·{' '}
                        {appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 4: Clinical Notes ───────────────────────────── */}
      <TabsContent value="notes" className="mt-0">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-on-surface">Clinical Notes</h3>
            <Link
              href={`/clinical-notes/new?patient=${patient.id}`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2')}
            >
              <FileText className="h-4 w-4" />
              Create Document
            </Link>
          </div>
          {clinicalNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-on-surface-variant">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-outline">
                <ClipboardList className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No clinical notes yet</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {clinicalNotes.map((note, idx) => (
                <div
                  key={note.id}
                  role="button"
                  aria-label={`Open document ${note.title}`}
                  tabIndex={0}
                  onClick={() => router.push(`/clinical-notes/${note.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/clinical-notes/${note.id}`)
                    }
                  }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-secondary-container/20 active:bg-secondary-container/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    idx === 0 && 'bg-secondary-container/15'
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{note.title}</p>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {note.document_type.replace(/_/g, ' ')} · v{note.version} · {formatDate(note.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="border-0 bg-primary/10 px-3 py-1 text-[11px] font-semibold capitalize text-primary">
                    {note.document_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 5: Lab Reports ──────────────────────────────── */}
      <TabsContent value="labs" className="mt-0">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-on-surface">Lab Reports</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateReportLink}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-outline-variant px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-container-low active:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {isPending ? 'Generating...' : 'Get Report'}
              </button>
              <Link
                href={`/patients/${patient.id}/lab-reports/upload`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 border-outline-variant text-primary')}
              >
                <Upload className="h-4 w-4" />
                Upload Report
              </Link>
            </div>
          </div>

          {labReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-on-surface-variant">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-outline">
                <FlaskConical className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">No lab reports yet</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {labReports.map((report) => (
                <div
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open lab report ${report.title}`}
                  onClick={() => router.push(`/patients/${patient.id}/lab-reports/${report.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/patients/${patient.id}/lab-reports/${report.id}`)
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary-container/20 active:bg-secondary-container/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{report.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                      {report.report_type ? REPORT_TYPE_LABELS[report.report_type] ?? report.report_type : 'Other'}
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {report.upload_source === 'patient' ? <User className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                        {report.upload_source === 'patient' ? 'Patient' : 'Dietitian'}
                      </span>
                      <span>·</span>
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/patients/${patient.id}/lab-reports/${report.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-surface-container-low"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Metrics
                    </Link>
                    {report.ai_summary && (
                      <Badge className="border-0 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        AI Analyzed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Section 6: Timeline ─────────────────────────────────── */}
      <TabsContent value="timeline" className="mt-0">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-white py-12 text-on-surface-variant shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)]">
            <Clock className="h-8 w-8 opacity-50" />
            <p className="text-sm font-medium">No activity yet</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-outline-variant bg-white p-3 shadow-[0_10px_26px_-20px_rgba(8,47,75,0.6)] sm:p-4">
            <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px] pr-2">
              <div className="space-y-3">
                {groupedTimeline.map((group, groupIdx) => (
                  <CollapsibleSection
                    key={group.label}
                    title={group.label}
                    count={group.events.length}
                    defaultOpen={groupIdx === 0}
                    className="rounded-xl"
                    contentClassName="pt-2"
                  >
                    <div className="relative">
                      <div className="absolute bottom-0 left-3.5 top-0 w-px bg-outline-variant/80" />
                      <div className="space-y-0 pl-10">
                        {group.events.map((event) => {
                          const IconComponent = TIMELINE_ICONS[event.event_type] ?? FileText
                          const eventStyle = getTimelineThemeClasses(event.event_type)
                          const eventData = (event.event_data ?? {}) as Record<string, unknown>
                          const label =
                            event.event_type === 'note_added' && eventData.note
                              ? String(eventData.note)
                              : event.event_type.replace(/_/g, ' ')

                          return (
                            <div key={event.id} className="relative pb-3">
                              <span className={cn('absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm', eventStyle.dotClassName)}>
                                <IconComponent className="h-3.5 w-3.5" />
                              </span>
                              <div className={cn('rounded-xl border bg-white px-3 py-2 transition-colors hover:border-primary/20 hover:bg-surface-container-low/40', eventStyle.cardClassName)}>
                                <p className="text-sm font-semibold capitalize text-on-surface">{label}</p>
                                <p className="mt-0.5 text-xs text-on-surface-variant">
                                  {formatDateTime(event.created_at)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </TabsContent>

      {/* AI Insights Floating Action Button */}
      <AIInsightsFab patientId={patient.id} />
    </Tabs>
  )
}
