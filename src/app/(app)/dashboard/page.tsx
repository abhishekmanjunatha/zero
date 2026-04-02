import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardList,
  CalendarPlus,
  ChevronRight,
  Clock,
  Eye,
  FlaskConical,
  History,
  MoreHorizontal,
  NotebookPen,
  PencilLine,
  UserPlus,
} from 'lucide-react'
import {
  getTodayAppointments,
  getRecentPatients,
  getDietitianGreeting,
  getDashboardStats,
  getRecentActivity,
} from '@/actions/dashboard'
import type { RecentActivityEvent, RecentPatient, TodayAppointment } from '@/actions/dashboard'
import { DashboardActionHub } from '@/components/dashboard/dashboard-action-hub'
import { DashboardSecondaryPanels } from '@/components/dashboard/dashboard-secondary-panels'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAppointmentStatusMeta } from '@/lib/constants/appointment-status'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

const PURPOSE_CONFIG: Record<TodayAppointment['purpose'], string> = {
  new_consultation:   'New Consultation',
  follow_up:          'Follow-up',
  review_with_report: 'Review with Report',
  custom:             'Custom',
}

const MODE_CONFIG: Record<TodayAppointment['mode'], string> = {
  walk_in:   'Walk-in',
  scheduled: 'Scheduled',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStatusBadgeClasses(status: TodayAppointment['status']) {
  if (status === 'completed') return 'bg-tertiary-fixed text-tertiary'
  if (status === 'upcoming') return 'bg-secondary-container text-primary'
  if (status === 'checked_in') return 'bg-secondary-container text-primary'
  if (status === 'in_progress') return 'bg-secondary-container text-primary'
  if (status === 'cancelled') return 'bg-error-container text-destructive'
  return 'bg-amber-100 text-amber-800'
}

function getRecentPatientLine(patient: RecentPatient) {
  if (!patient.last_visit_at) return 'Newly added patient'
  const diffDays = Math.floor((Date.now() - new Date(patient.last_visit_at).getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Last seen today'
  if (diffDays === 1) return 'Last seen yesterday'
  return `Last seen ${diffDays} days ago`
}

function getActivityLabel(event: RecentActivityEvent) {
  if (event.event_type.startsWith('appointment_')) return 'Appointment update'
  if (event.event_type.startsWith('lab_report_')) return 'Lab review update'
  if (event.event_type.startsWith('document_')) return 'Clinical note update'
  if (event.event_type.startsWith('patient_')) return 'Patient profile update'
  return 'Activity update'
}

function getMobileScheduleNote(purpose: TodayAppointment['purpose']) {
  if (purpose === 'follow_up') return 'Patient reports mild discomfort in left knee, mobility improving.'
  if (purpose === 'review_with_report') return 'Reviewing latest lab markers and adjusting guidance accordingly.'
  return 'Session progressing well with healthy adherence and symptom control.'
}

interface DesktopQuickAction {
  title: string
  subtitle: string
  href: string
  icon: React.ReactNode
  iconContainerClassName: string
  badge?: string
}

function DesktopDashboardActions({ todayCount }: { todayCount: number }) {
  const actions: DesktopQuickAction[] = [
    {
      title: 'Add Patient',
      subtitle: 'Register new clinical profile',
      href: '/patients/new',
      icon: <UserPlus className="h-4.5 w-4.5 text-primary" />,
      iconContainerClassName: 'bg-secondary-container',
    },
    {
      title: 'Book Slot',
      subtitle: 'Manage clinician availability',
      href: '/appointments/new',
      icon: <CalendarPlus className="h-4.5 w-4.5 text-primary" />,
      iconContainerClassName: 'bg-secondary-container',
      badge: `${todayCount} TODAY`,
    },
    {
      title: 'Upload Lab',
      subtitle: 'Import diagnostic results',
      href: '/lab-reports/upload',
      icon: <FlaskConical className="h-4.5 w-4.5 text-tertiary" />,
      iconContainerClassName: 'bg-tertiary-fixed/30',
    },
    {
      title: 'Write Note',
      subtitle: 'SOAP or follow-up entries',
      href: '/clinical-notes/new',
      icon: <NotebookPen className="h-4.5 w-4.5 text-amber-700" />,
      iconContainerClassName: 'bg-amber-100',
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className="group relative cursor-pointer rounded-xl border border-outline-variant/20 bg-white p-4 shadow-[0_2px_8px_rgba(25,28,29,0.06)] transition-shadow hover:shadow-md"
        >
          <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-lg', action.iconContainerClassName)}>
            {action.icon}
          </div>

          {action.badge && (
            <span className="absolute right-4 top-4 rounded-full bg-tertiary-fixed/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-tertiary">
              {action.badge}
            </span>
          )}

          <h3 className="font-bold text-on-surface">{action.title}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">{action.subtitle}</p>
        </Link>
      ))}
    </section>
  )
}

function DesktopScheduleTable({ appointments }: { appointments: TodayAppointment[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-[0_2px_8px_rgba(25,28,29,0.06)]">
      <div className="grid grid-cols-[2.1fr_1.4fr_1fr_1fr] border-b border-outline-variant/20 bg-surface-container-low px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        <span>Patient &amp; ID</span>
        <span>Time / Type</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>

      {appointments.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-outline">No appointments scheduled for today.</div>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {appointments.slice(0, 6).map((appt) => {
            const status = getAppointmentStatusMeta(appt.status)
            const purposeLabel =
              appt.purpose === 'custom' && appt.custom_purpose
                ? appt.custom_purpose
                : PURPOSE_CONFIG[appt.purpose]

            return (
              <div key={appt.id} className="grid grid-cols-[2.1fr_1.4fr_1fr_1fr] items-center px-6 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">
                    {getInitials(appt.patient.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-on-surface">{appt.patient.full_name}</p>
                    <p className="text-xs text-on-surface-variant">ID: {appt.patient.patient_code}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-on-surface">{formatTime(appt.appointment_time)}</p>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                    {purposeLabel} · {MODE_CONFIG[appt.mode]}
                  </p>
                </div>

                <div>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter',
                      getStatusBadgeClasses(appt.status)
                    )}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="text-right">
                  {appt.status === 'upcoming' || appt.status === 'checked_in' ? (
                    <Link
                      href={`/clinical-notes?patient=${appt.patient.id}&appointment=${appt.id}`}
                      className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/85"
                    >
                      Start Visit
                    </Link>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/patients/${appt.patient.id}`}
                        className="inline-flex rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                        aria-label="View patient"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/patients/${appt.patient.id}?tab=timeline`}
                        className="inline-flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-container-low"
                        aria-label="View history"
                      >
                        <History className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function DesktopRightRail({
  recentPatients,
  recentActivity,
  pendingFollowUps,
}: {
  recentPatients: RecentPatient[]
  recentActivity: RecentActivityEvent[]
  pendingFollowUps: number
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-[0_2px_8px_rgba(25,28,29,0.06)]">
      <Tabs defaultValue="patients">
        <TabsList variant="line" className="h-auto w-full rounded-none border-b border-outline-variant/20 bg-white p-0">
          <TabsTrigger
            id="desktop-dashboard-tab-patients"
            value="patients"
            className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Patients
          </TabsTrigger>
          <TabsTrigger
            id="desktop-dashboard-tab-activity"
            value="activity"
            className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            id="desktop-dashboard-tab-followups"
            value="followups"
            className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            Follow-ups
          </TabsTrigger>
        </TabsList>

        <TabsContent id="desktop-dashboard-panel-patients" value="patients" className="m-0 p-0">
          <ul className="space-y-4 p-6">
            {recentPatients.slice(0, 3).map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/patients/${patient.id}`}
                  className="group flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-sm font-bold text-on-surface-variant">
                    {getInitials(patient.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{patient.full_name}</p>
                    <p className="truncate text-xs italic text-on-surface-variant">{getRecentPatientLine(patient)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="border-t border-outline-variant/20 bg-surface-container-low px-6 py-5">
            <Link href="/patients" className="group flex w-full items-center justify-between gap-2 text-xs font-bold text-primary">
              View Full Patient Directory
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </TabsContent>

        <TabsContent id="desktop-dashboard-panel-activity" value="activity" className="m-0 p-6">
          <ul className="space-y-4">
            {recentActivity.slice(0, 4).map((event) => (
              <li key={event.id}>
                <Link href={`/patients/${event.patient_id}`} className="group flex items-start gap-3 hover:opacity-90">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />
                  <div>
                    <p className="text-sm font-bold text-on-surface">{event.patient_name}</p>
                    <p className="text-xs italic text-on-surface-variant">{getActivityLabel(event)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent id="desktop-dashboard-panel-followups" value="followups" className="m-0 p-6">
          <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
            <p className="text-sm text-outline">Pending follow-up appointments</p>
            <p className="text-4xl font-semibold leading-none text-primary">{pendingFollowUps}</p>
            <Link
              href="/appointments?filter=upcoming"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/85"
            >
              Open Follow-up Queue
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function DesktopPerformanceBanner() {
  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl p-8 text-white shadow-xl">
      <div className="absolute inset-0 z-0">
        <div className="h-full w-full bg-gradient-to-r from-primary/90 to-primary/40" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:58px_58px]" />
      <div className="relative z-10 max-w-xl text-white">
        <h3 className="text-2xl font-black tracking-tight">Practice Performance</h3>
        <p className="mt-2 text-sm font-medium text-white/85">
            Your patient satisfaction score is up 12% this month. Keep up the empathetic architecture of your care.
        </p>

        <div className="mt-6 flex gap-4">
          <Button className="h-9 rounded-lg bg-white px-6 text-sm font-bold text-primary hover:bg-surface-container-low">Generate Report</Button>
          <Button variant="outline" className="h-9 rounded-lg border-white/30 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/15">
            Details
          </Button>
        </div>
      </div>
    </section>
  )
}

// ─── Appointment Card ──────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: TodayAppointment }) {
  const status = getAppointmentStatusMeta(appt.status)
  const purposeLabel =
    appt.purpose === 'custom' && appt.custom_purpose
      ? appt.custom_purpose
      : PURPOSE_CONFIG[appt.purpose]

  const showPreview = appt.status === 'completed'

  return (
    <div className="rounded-3xl border border-outline-variant bg-white p-4 shadow-[0_10px_24px_rgba(25,28,29,0.04)] transition-all hover:border-outline-variant/50 hover:shadow-[0_12px_28px_rgba(25,28,29,0.09)]">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-lg font-semibold text-outline">
          {getInitials(appt.patient.full_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-on-surface">{appt.patient.full_name}</p>
            <span
              className={cn(
                'inline-flex shrink-0 rounded-full border border-outline-variant/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.02em]',
                getStatusBadgeClasses(appt.status)
              )}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-outline/70">ID: {appt.patient.patient_code}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-outline">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-outline" />
          <span className="font-medium">{formatTime(appt.appointment_time)}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <ClipboardList className="h-4 w-4 shrink-0 text-outline" />
          <span>{purposeLabel}</span>
        </span>
      </div>

      {showPreview && (
        <div className="mt-3 rounded-2xl bg-surface-container-low px-4 py-3 text-xs italic text-outline">
          &quot;{getMobileScheduleNote(appt.purpose)}&quot;
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {showPreview ? (
          <>
            <Link
              href={`/patients/${appt.patient.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-2xl bg-secondary-container px-4 text-sm font-medium text-outline"
            >
              View
            </Link>
            <Link
              href={`/patients/${appt.patient.id}?tab=timeline`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-2xl border border-outline-variant bg-white px-4 text-sm font-medium text-on-surface"
            >
              History
            </Link>
            <Link
              href={`/clinical-notes?patient=${appt.patient.id}&appointment=${appt.id}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-outline-variant bg-white text-on-surface"
              aria-label="Edit note"
            >
              <PencilLine className="h-4.5 w-4.5" />
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`/clinical-notes?patient=${appt.patient.id}&appointment=${appt.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-sm"
            >
              Start Visit
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-outline-variant/50 bg-transparent text-on-surface"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4.5 w-4.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [stats, todayAppointments, recentPatients, recentActivity, greeting] =
    await Promise.all([
      getDashboardStats(),
      getTodayAppointments(),
      getRecentPatients(),
      getRecentActivity(),
      getDietitianGreeting(),
    ])

  const displayName = greeting.fullName?.trim() || 'Doctor'
  const firstName = displayName.split(' ')[0]

  return (
    <>
      <div className="hidden space-y-6 lg:block">
        <section>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Clinical Overview</h1>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            Good morning, Dr. {firstName}. You have {stats.todayCount} appointments today.
          </p>
        </section>

        <DesktopDashboardActions todayCount={stats.todayCount} />

        <section className="space-y-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">Today&apos;s Schedule</h2>
            <Link href="/appointments" className="text-sm font-semibold text-primary hover:underline">
              View Calendar
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DesktopScheduleTable appointments={todayAppointments} />
            </div>

            <div>
              <DesktopRightRail
                recentPatients={recentPatients}
                recentActivity={recentActivity}
                pendingFollowUps={stats.pendingFollowUps}
              />
            </div>
          </div>
        </section>

        <DesktopPerformanceBanner />
      </div>

      <div className="space-y-6 lg:hidden">
        <DashboardActionHub stats={stats} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-on-surface">Today&apos;s Schedule</h2>
            <Link href="/appointments" className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              See All
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="rounded-3xl border border-outline-variant bg-white p-6 text-center text-sm text-outline">
              No appointments scheduled for today.
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.slice(0, 2).map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} />
              ))}
            </div>
          )}
        </section>

        <DashboardSecondaryPanels
          recentPatients={recentPatients}
          recentActivity={recentActivity}
          stats={stats}
        />
      </div>
    </>
  )
}

