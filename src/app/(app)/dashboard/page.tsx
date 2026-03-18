import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarPlus,
  UserPlus,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react'
import { getTodayAppointments, getRecentPatients } from '@/actions/dashboard'
import type { TodayAppointment, RecentPatient } from '@/actions/dashboard'
import { PatientSearchCommand } from '@/components/layout/patient-search-command'
import { AppointmentQuickActions } from '@/components/dashboard/appointment-quick-actions'
import { LinkButton } from '@/components/ui/link-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_CONFIG: Record<
  TodayAppointment['status'],
  { label: string; className: string }
> = {
  upcoming: { label: 'Upcoming', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  checked_in: { label: 'Checked In', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  in_progress: { label: 'In Progress', className: 'bg-primary/15 text-primary border-primary/30' },
  completed: { label: 'Completed', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 border-red-200' },
  no_show: { label: 'No Show', className: 'bg-orange-100 text-orange-700 border-orange-200' },
}

const MODE_CONFIG: Record<TodayAppointment['mode'], string> = {
  walk_in: 'Walk-in',
  scheduled: 'Scheduled',
}

const PURPOSE_CONFIG: Record<TodayAppointment['purpose'], string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: TodayAppointment }) {
  const status = STATUS_CONFIG[appt.status]
  const purposeLabel =
    appt.purpose === 'custom' && appt.custom_purpose
      ? appt.custom_purpose
      : PURPOSE_CONFIG[appt.purpose]

  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 hover:bg-accent/30 transition-colors">
      {/* Left info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{appt.patient.full_name}</p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0',
                  status.className
                )}
              >
                {status.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{appt.patient.patient_code}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTime(appt.appointment_time)}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{purposeLabel}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{MODE_CONFIG[appt.mode]}</span>
            </div>
          </div>
        </div>

        {/* Right: quick actions + quick links */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
          <AppointmentQuickActions
            appointmentId={appt.id}
            patientId={appt.patient.id}
            status={appt.status}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Recent Patient Row ───────────────────────────────────────────────────────

function RecentPatientRow({ patient }: { patient: RecentPatient }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{patient.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {patient.patient_code}
            {patient.last_visit_at && (
              <span className="ml-2">· Last visit: {formatDate(patient.last_visit_at)}</span>
            )}
          </p>
        </div>
      </div>
      <LinkButton
        href={`/patients/${patient.id}`}
        title="Open Patient Profile"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </LinkButton>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [todayAppointments, recentPatients] = await Promise.all([
    getTodayAppointments(),
    getRecentPatients(),
  ])

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-7 max-w-5xl">
      {/* ── Section 1: Quick Actions ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <PatientSearchCommand className="max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <LinkButton
              href="/appointments/new"
              variant="default"
              size="sm"
              className="h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Add Appointment
            </LinkButton>
            <LinkButton
              href="/patients/new"
              variant="outline"
              size="sm"
              className="h-8 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add Patient
            </LinkButton>
          </div>
        </CardContent>
      </Card>

      {/* Date header */}
      <p className="text-sm text-muted-foreground">{todayFormatted}</p>

      {/* ── Section 2: Today's Appointments ─────────────────────────────── */}
      <CollapsibleSection
        title="Today's Appointments"
        subtitle="Keep track of upcoming and completed visits"
        count={todayAppointments.length}
        defaultOpen
        className="clay-card"
        contentClassName="space-y-2"
      >
        <div className="mb-1 flex justify-end">
          <Link
            href="/appointments"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {todayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <CalendarPlus className="h-8 w-8 opacity-40" />
            <p className="text-sm">No appointments scheduled for today</p>
            <LinkButton
              href="/appointments/new"
              variant="outline"
              size="sm"
              className="mt-1 gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule Appointment
            </LinkButton>
          </div>
        ) : (
          todayAppointments.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} />
          ))
        )}
      </CollapsibleSection>

      {/* ── Section 3: Recent Patients ──────────────────────────────────── */}
      <CollapsibleSection
        title="Recent Patients"
        subtitle="Jump back into the latest active cases"
        count={recentPatients.length}
        className="clay-card"
        contentClassName="space-y-1"
      >
        <div className="mb-1 flex justify-end">
          <Link
            href="/patients"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {recentPatients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <UserPlus className="h-8 w-8 opacity-40" />
            <p className="text-sm">No patients yet</p>
            <LinkButton
              href="/patients/new"
              variant="outline"
              size="sm"
              className="mt-1 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add First Patient
            </LinkButton>
          </div>
        ) : (
          recentPatients.map((patient) => (
            <RecentPatientRow key={patient.id} patient={patient} />
          ))
        )}
      </CollapsibleSection>
    </div>
  )
}

