'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  CalendarPlus,
  CalendarDays,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react'
import type { AppointmentWithPatient } from '@/actions/appointments'
import { updateAppointmentStatus } from '@/actions/appointments'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type FilterKey = 'today' | 'upcoming' | 'completed'

interface AppointmentsListProps {
  appointments: AppointmentWithPatient[]
  activeFilter: FilterKey
  fetchError?: string | null
}

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
]

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

export function AppointmentsList({
  appointments,
  activeFilter,
  fetchError,
}: AppointmentsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleFilterChange = (key: FilterKey) => {
    const params = new URLSearchParams()
    if (key !== 'today') params.set('filter', key)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleMarkCompleted = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'completed')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment completed successfully')
      }
    })
  }

  const handleMarkInProgress = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'in_progress')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment started')
      }
    })
  }

  const handleCheckIn = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'checked_in')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Patient checked in')
      }
    })
  }

  const handleNoShow = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'no_show')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment marked as no-show')
      }
    })
  }

  const handleCancel = (id: string) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(id, 'cancelled')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Appointment cancelled')
      }
    })
  }

  return (
    <div className="space-y-3.5">
      {/* Top: Filters + Add button */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/80 rounded-2xl p-1.5">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors min-h-10',
                activeFilter === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Link
          href="/appointments/new"
          className={cn(
            buttonVariants({ variant: 'default' }),
            'bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0 rounded-full px-5 min-h-11'
          )}
        >
          <CalendarPlus className="h-4 w-4" />
          Add Appointment
        </Link>
      </div>

      {/* Empty State */}
      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-xl bg-card">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-xs text-muted-foreground">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={() => router.refresh()} className="mt-1">
            Try again
          </Button>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">No appointments found</p>
          <p className="text-xs">Start by scheduling a new appointment.</p>
          <Link
            href="/appointments/new"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
          >
            <CalendarPlus className="h-4 w-4" />
            Add Appointment
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ───────────────────────────────────── */}
          <div className="hidden md:block clay-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Patient</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Purpose</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Mode</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Date & Time</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Status</th>
                  <th className="text-right font-medium px-4 py-2.5 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.map((appt) => {
                  const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
                  const purposeLabel =
                    appt.purpose === 'custom' && appt.custom_purpose
                      ? appt.custom_purpose
                      : PURPOSE_LABELS[appt.purpose]

                  return (
                    <tr key={appt.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{appt.patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">{appt.patient.patient_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{purposeLabel}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="font-normal text-xs capitalize">
                          {appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="text-sm">{formatDate(appt.appointment_date)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.appointment_time)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            status.cn
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/patients/${appt.patient.id}`}
                            title="Patient Profile"
                            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-10 w-10 rounded-xl')}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>

                          {/* Actions dropdown */}
                          {appt.status !== 'completed' && appt.status !== 'cancelled' && appt.status !== 'no_show' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {appt.status === 'upcoming' && appt.mode === 'scheduled' && (
                                  <DropdownMenuItem
                                    onClick={() => handleCheckIn(appt.id)}
                                    disabled={isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Check In
                                  </DropdownMenuItem>
                                )}

                                {(appt.status === 'upcoming' || appt.status === 'checked_in') && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkInProgress(appt.id)}
                                    disabled={isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <Clock className="h-4 w-4" />
                                    Start Consultation
                                  </DropdownMenuItem>
                                )}

                                {appt.status === 'in_progress' && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkCompleted(appt.id)}
                                    disabled={isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Mark as Completed
                                  </DropdownMenuItem>
                                )}

                                {(appt.status === 'upcoming' || appt.status === 'checked_in') && (
                                  <DropdownMenuItem
                                    onClick={() => handleNoShow(appt.id)}
                                    disabled={isPending}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <UserX className="h-4 w-4" />
                                    Mark as No-show
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleCancel(appt.id)}
                                  disabled={isPending}
                                  variant="destructive"
                                  className="gap-2 cursor-pointer"
                                >
                                  Cancel Appointment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ────────────────────────────────────── */}
          <div className="md:hidden space-y-1.5">
            {appointments.map((appt) => {
              const status = STATUS_CFG[appt.status] ?? STATUS_CFG.upcoming
              const purposeLabel =
                appt.purpose === 'custom' && appt.custom_purpose
                  ? appt.custom_purpose
                  : PURPOSE_LABELS[appt.purpose]

              return (
                <div
                  key={appt.id}
                  className="px-3 py-2.5 rounded-xl border bg-card/85 backdrop-blur-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{appt.patient.full_name}</p>
                        <p className="text-xs text-muted-foreground">{appt.patient.patient_code}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0',
                        status.cn
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{purposeLabel}</span>
                    <span>{appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}</span>
                    <span>{formatDate(appt.appointment_date)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(appt.appointment_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/patients/${appt.patient.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 flex-1 min-h-10 rounded-xl')}
                    >
                      <User className="h-3.5 w-3.5" />
                      Profile
                    </Link>
                    {(appt.status === 'upcoming' || appt.status === 'checked_in' || appt.status === 'in_progress') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (appt.status === 'in_progress') {
                            handleMarkCompleted(appt.id)
                            return
                          }
                          if (appt.status === 'upcoming' && appt.mode === 'scheduled') {
                            handleCheckIn(appt.id)
                            return
                          }
                          handleMarkInProgress(appt.id)
                        }}
                        disabled={isPending}
                        className="gap-1.5 flex-1 min-h-10 rounded-xl"
                      >
                        {appt.status === 'in_progress' ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark as Completed
                          </>
                        ) : appt.status === 'upcoming' && appt.mode === 'scheduled' ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Check In
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            Start Consultation
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
