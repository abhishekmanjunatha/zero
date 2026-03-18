'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarPlus,
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
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LabReportsList } from '@/components/lab-reports/lab-reports-list'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

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

const STATUS_CFG: Record<string, { label: string; cn: string }> = {
  upcoming: { label: 'Upcoming', cn: 'bg-amber-100 text-amber-700 border-amber-200' },
  checked_in: { label: 'Checked In', cn: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  in_progress: { label: 'In Progress', cn: 'bg-primary/15 text-primary border-primary/30' },
  completed: { label: 'Completed', cn: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', cn: 'bg-red-100 text-red-600 border-red-200' },
  no_show: { label: 'No Show', cn: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const PURPOSE_LABELS: Record<string, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
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

const TIMELINE_STYLE: Record<string, { dot: string; card: string }> = {
  appointment_created: {
    dot: 'bg-amber-100 text-amber-700 border-amber-200',
    card: 'border-amber-100/80',
  },
  appointment_checked_in: {
    dot: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    card: 'border-indigo-100/80',
  },
  appointment_in_progress: {
    dot: 'bg-primary/15 text-primary border-primary/30',
    card: 'border-primary/25',
  },
  appointment_completed: {
    dot: 'bg-slate-100 text-slate-600 border-slate-200',
    card: 'border-slate-200/80',
  },
  appointment_cancelled: {
    dot: 'bg-red-100 text-red-700 border-red-200',
    card: 'border-red-100/80',
  },
  appointment_no_show: {
    dot: 'bg-orange-100 text-orange-700 border-orange-200',
    card: 'border-orange-100/80',
  },
  clinical_document_created: {
    dot: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    card: 'border-cyan-100/80',
  },
  lab_report_uploaded: {
    dot: 'bg-secondary/35 text-secondary-foreground border-secondary/55',
    card: 'border-secondary/40',
  },
  weight_updated: {
    dot: 'bg-lime-100 text-lime-700 border-lime-200',
    card: 'border-lime-100/80',
  },
  note_added: {
    dot: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    card: 'border-zinc-200/80',
  },
}

// ── Info Row helper ───────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/90">{label}</p>
      <div className="mt-1 text-sm font-medium leading-snug text-foreground">{value ?? '—'}</div>
    </div>
  )
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
  const age = calcAge(patient.date_of_birth)

  const defaultTab =
    initialTab && ['summary', 'health', 'appointments', 'notes', 'labs', 'timeline'].includes(initialTab)
      ? initialTab
      : 'summary'

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

  return (
    <Tabs defaultValue={defaultTab} className="space-y-3 sm:space-y-4">
      <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList variant="line" className="h-auto w-max min-w-full flex-nowrap justify-start gap-1">
          <TabsTrigger value="summary" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">Summary</TabsTrigger>
          <TabsTrigger value="health" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">Health Info</TabsTrigger>
          <TabsTrigger value="appointments" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">
            Appointments
            {appointments.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {appointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">
            Clinical Notes
            {clinicalNotes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {clinicalNotes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="labs" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">
            Lab Reports
            {labReports.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                {labReports.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm">Timeline</TabsTrigger>
        </TabsList>
      </div>

      {/* ── Section 1: Patient Summary ─────────────────────────── */}
      <TabsContent value="summary" className="mt-0">
        <div className="clay-card p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            <InfoRow label="Full Name" value={patient.full_name} />
            <InfoRow label="Patient ID" value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{patient.patient_code}</code>} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Age" value={age !== null ? `${age} years` : null} />
            <InfoRow
              label="Gender"
              value={patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).replace('_', ' ') : null}
            />
            <InfoRow
              label="Height"
              value={patient.height_cm ? `${patient.height_cm} cm` : null}
            />
            <InfoRow
              label="Weight"
              value={patient.weight_kg ? `${patient.weight_kg} kg` : null}
            />
            <InfoRow
              label="Primary Goal"
              value={
                patient.primary_goal ? (
                  <Badge variant="secondary" className="font-normal">
                    {GOAL_LABELS[patient.primary_goal] ?? patient.primary_goal}
                  </Badge>
                ) : null
              }
            />
            <InfoRow label="Last Visit" value={formatDate(patient.last_visit_at)} />
            <InfoRow label="Patient Since" value={formatDate(patient.created_at)} />
          </div>
        </div>
      </TabsContent>

      {/* ── Section 2: Health Information ──────────────────────── */}
      <TabsContent value="health" className="mt-0">
        <div className="space-y-3">
          <div className="clay-card p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
            className="clay-card"
          >
            {patient.medical_conditions?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.medical_conditions.map((c) => (
                  <Badge key={c} variant="secondary" className="font-normal text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No medical conditions recorded.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Food Allergies"
            subtitle="Critical intolerance and allergy references"
            count={patient.food_allergies?.length ?? 0}
            className="clay-card"
          >
            {patient.food_allergies?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {patient.food_allergies.map((a) => (
                  <Badge key={a} variant="secondary" className="font-normal text-xs bg-accent/25 text-accent-foreground">
                    {a}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No allergies recorded.</p>
            )}
          </CollapsibleSection>
        </div>
      </TabsContent>

      {/* ── Section 3: Appointment History ─────────────────────── */}
      <TabsContent value="appointments" className="mt-0">
        <div className="clay-card overflow-hidden">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <CalendarDays className="h-8 w-8 opacity-40" />
              <p className="text-sm">No appointments yet</p>
              <Link
                href={`/appointments/new?patient=${patient.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
              >
                <CalendarPlus className="h-4 w-4" />
                Create Appointment
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {appointments.map((appt) => {
                const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
                return (
                  <div key={appt.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {appt.purpose === 'custom' && appt.custom_purpose
                            ? appt.custom_purpose
                            : PURPOSE_LABELS[appt.purpose]}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                            status.cn
                          )}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
        <div className="clay-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-medium">Clinical Notes</h3>
            <Link
              href={`/clinical-notes/new?patient=${patient.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <FileText className="h-4 w-4" />
              Create Document
            </Link>
          </div>
          {clinicalNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-40" />
              <p className="text-sm">No clinical notes yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {clinicalNotes.map((note) => (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/clinical-notes/${note.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      router.push(`/clinical-notes/${note.id}`)
                    }
                  }}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {note.document_type.replace(/_/g, ' ')} · v{note.version} · {formatDate(note.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="font-normal capitalize text-xs">
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
        <LabReportsList
          reports={labReports}
          patientId={patient.id}
          patientName={patient.full_name}
          hideTitle
        />
      </TabsContent>

      {/* ── Section 6: Timeline ─────────────────────────────────── */}
      <TabsContent value="timeline" className="mt-0">
        {timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground rounded-xl border bg-card">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-3 sm:p-4">
            <ScrollArea className="h-[420px] sm:h-[520px] lg:h-[640px] pr-2">
              <div className="space-y-4">
                {groupedTimeline.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h4 className="sticky top-0 z-10 w-fit rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                      {group.label}
                    </h4>
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-0 pl-11">
                        {group.events.map((event) => {
                          const IconComponent = TIMELINE_ICONS[event.event_type] ?? FileText
                          const eventStyle = TIMELINE_STYLE[event.event_type] ?? {
                            dot: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                            card: 'border-zinc-200/80',
                          }
                          const eventData = (event.event_data ?? {}) as Record<string, unknown>
                          const label =
                            event.event_type === 'note_added' && eventData.note
                              ? String(eventData.note)
                              : event.event_type.replace(/_/g, ' ')

                          return (
                            <div key={event.id} className="relative pb-4">
                              <span className={cn('absolute -left-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm', eventStyle.dot)}>
                                <IconComponent className="h-3.5 w-3.5" />
                              </span>
                              <div className={cn('rounded-lg border bg-card px-3 py-2.5', eventStyle.card)}>
                                <p className="text-sm font-medium capitalize">{label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatDateTime(event.created_at)}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
