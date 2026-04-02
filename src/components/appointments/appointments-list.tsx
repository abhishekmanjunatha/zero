'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/shared/empty-state'
import {
  CalendarDays,
  User,
  Eye,
  Pencil,
  EllipsisVertical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  UserCheck,
  UserX,
} from 'lucide-react'
import type { AppointmentWithPatient } from '@/actions/appointments'
import { updateAppointmentStatus } from '@/actions/appointments'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getAppointmentStatusMeta } from '@/lib/constants/appointment-status'
import { StatusBadge } from '@/components/shared/status-badge'
import { AvatarCircle } from '@/components/shared/list-shell'
import { AIInsightsSheet } from '@/components/shared/ai-insights-sheet'
import { cn } from '@/lib/utils'

interface AppointmentsListProps {
  appointments: AppointmentWithPatient[]
  fetchError?: string | null
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase() || 'PT'
}

function getModeClasses(mode: AppointmentWithPatient['mode']) {
  if (mode === 'walk_in') return 'bg-surface-container-high text-on-surface-variant'
  return 'bg-secondary-container text-primary'
}

export function AppointmentsList({
  appointments,
  fetchError,
}: AppointmentsListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [aiSheetPatientId, setAiSheetPatientId] = useState<string | null>(null)

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
    <div className="space-y-4">
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
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="No appointments found"
          description="Use New Appointment in the page header to schedule a slot."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)] lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-8 py-4 text-left">Patient</th>
                  <th className="px-6 py-4 text-left">Purpose</th>
                  <th className="px-6 py-4 text-left">Mode</th>
                  <th className="px-6 py-4 text-left">Date &amp; Time</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {appointments.map((appt) => {
                  const status = getAppointmentStatusMeta(appt.status)
                  const purposeLabel =
                    appt.purpose === 'custom' && appt.custom_purpose
                      ? appt.custom_purpose
                      : PURPOSE_LABELS[appt.purpose]
                  const modeLabel = appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'
                  const detailsLabel = appt.notes?.trim() || `${modeLabel} consultation`
                  const isMutable =
                    appt.status !== 'completed' &&
                    appt.status !== 'cancelled' &&
                    appt.status !== 'no_show'

                  return (
                    <tr key={appt.id} className="group transition-colors hover:bg-surface-container-low">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <AvatarCircle initials={getInitials(appt.patient.full_name)} />
                          <div>
                            <p className="font-bold leading-tight text-primary">{appt.patient.full_name}</p>
                            <p className="text-xs font-medium text-on-surface-variant">ID: {appt.patient.patient_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">{purposeLabel}</span>
                          <span className="text-xs text-on-surface-variant">{detailsLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
                            getModeClasses(appt.mode)
                          )}
                        >
                          {modeLabel}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-on-surface">{formatDate(appt.appointment_date)}</span>
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.appointment_time)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={appt.status} label={status.label} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/patients/${appt.patient.id}`}
                            title="View details"
                            className="rounded-lg p-2 text-primary hover:bg-secondary-container"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          <Link
                            href="/appointments/new"
                            title="Edit"
                            className="rounded-lg p-2 text-on-surface-variant hover:bg-secondary-container"
                          >
                            <Pencil className="h-5 w-5" />
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger className="cursor-pointer rounded-lg p-2 text-on-surface-variant hover:bg-secondary-container">
                              <EllipsisVertical className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => router.push(`/patients/${appt.patient.id}`)}
                                className="gap-2 cursor-pointer"
                              >
                                <User className="h-4 w-4" />
                                Open Patient Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAiSheetPatientId(appt.patient.id)}
                                className="gap-2 cursor-pointer"
                              >
                                <Sparkles className="h-4 w-4" />
                                AI Insights
                              </DropdownMenuItem>

                              {isMutable && (
                                <>
                                  <DropdownMenuSeparator />

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
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-outline-variant/20 bg-surface-container-low px-8 py-4">
              <p className="text-xs font-medium text-on-surface-variant">
                Showing <span className="font-bold text-on-surface">1-{appointments.length}</span> of {appointments.length} appointments
              </p>
              <div className="flex gap-2">
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container">1</button>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container">2</button>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container">3</button>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:hidden">
            {appointments.map((appt) => {
              const status = getAppointmentStatusMeta(appt.status)
              const purposeLabel =
                appt.purpose === 'custom' && appt.custom_purpose
                  ? appt.custom_purpose
                  : PURPOSE_LABELS[appt.purpose]
              const modeLabel = appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'
              const isCompleted = appt.status === 'completed'
              const isMutable =
                appt.status !== 'completed' &&
                appt.status !== 'cancelled' &&
                appt.status !== 'no_show'

              return (
                <div
                  key={appt.id}
                  className={cn(
                    'space-y-4 rounded-3xl p-5 shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)]',
                    isCompleted ? 'bg-surface-container opacity-80' : 'bg-white'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <AvatarCircle initials={getInitials(appt.patient.full_name)} size="lg" className="rounded-2xl" />
                      <div className="min-w-0">
                        <p className={cn('truncate font-bold leading-tight', isCompleted ? 'text-on-surface-variant line-through' : 'text-on-surface')}>
                          {appt.patient.full_name}
                        </p>
                        <p className="text-xs font-medium tracking-wide text-on-surface-variant">ID: {appt.patient.patient_code}</p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="rounded-full p-1 text-on-surface-variant">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container">
                          <EllipsisVertical className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => router.push(`/patients/${appt.patient.id}`)}
                            className="gap-2 cursor-pointer"
                          >
                            <User className="h-4 w-4" />
                            Open Patient Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setAiSheetPatientId(appt.patient.id)}
                            className="gap-2 cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4" />
                            AI Insights
                          </DropdownMenuItem>

                          {isMutable && (
                            <>
                              <DropdownMenuSeparator />

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
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-secondary-container px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                      {purposeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-xs font-medium text-on-surface-variant">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {modeLabel}
                    </span>
                  </div>

                  <div className={cn(
                    'flex items-center justify-between rounded-2xl p-3',
                    isCompleted ? 'bg-white/60' : 'bg-surface-container-low'
                  )}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-on-surface">
                        {formatDate(appt.appointment_date)}, {formatTime(appt.appointment_time)}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
                        status.badgeClassName
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* AI Insights Sheet — triggered from appointment dropdown */}
      {aiSheetPatientId && (
        <AIInsightsSheet
          patientId={aiSheetPatientId}
          open={!!aiSheetPatientId}
          onOpenChange={(open) => {
            if (!open) setAiSheetPatientId(null)
          }}
        />
      )}
    </div>
  )
}
