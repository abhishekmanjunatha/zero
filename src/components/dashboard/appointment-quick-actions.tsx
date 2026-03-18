'use client'

import { useTransition } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  History,
  Play,
  TestTubeDiagonal,
  User,
  UserCheck,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TodayAppointment } from '@/actions/dashboard'
import { updateAppointmentStatus } from '@/actions/appointments'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'

interface AppointmentQuickActionsProps {
  appointmentId: string
  patientId: string
  status: TodayAppointment['status']
}

export function AppointmentQuickActions({
  appointmentId,
  patientId,
  status,
}: AppointmentQuickActionsProps) {
  const [isPending, startTransition] = useTransition()

  const runStatusUpdate = (
    nextStatus: 'checked_in' | 'in_progress' | 'completed' | 'no_show',
    successMessage: string
  ) => {
    startTransition(async () => {
      const result = await updateAppointmentStatus(appointmentId, nextStatus)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(successMessage)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {status === 'upcoming' && (
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          title="Check In"
          className="h-7 w-7 rounded-full"
          disabled={isPending}
          onClick={() => runStatusUpdate('checked_in', 'Patient checked in')}
        >
          <UserCheck className="h-3.5 w-3.5" />
        </Button>
      )}

      {(status === 'upcoming' || status === 'checked_in') && (
        <Button
          type="button"
          size="icon-xs"
          title="Start Appointment"
          variant={status === 'checked_in' ? 'default' : 'outline'}
          className="h-7 w-7 rounded-full"
          disabled={isPending}
          onClick={() => runStatusUpdate('in_progress', 'Appointment started')}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>
      )}

      {(status === 'upcoming' || status === 'checked_in') && (
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          title="Mark No Show"
          className="h-7 w-7 rounded-full"
          disabled={isPending}
          onClick={() => runStatusUpdate('no_show', 'Appointment marked as no-show')}
        >
          <UserX className="h-3.5 w-3.5" />
        </Button>
      )}

      {status === 'in_progress' && (
        <Button
          type="button"
          size="icon-xs"
          variant="secondary"
          title="Complete Appointment"
          className="h-7 w-7 rounded-full"
          disabled={isPending}
          onClick={() => runStatusUpdate('completed', 'Appointment completed')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
      )}

      <LinkButton
        href={`/patients/${patientId}`}
        title="View Patient"
        variant="ghost"
        size="icon-xs"
        className="h-7 w-7 rounded-full"
      >
        <User className="h-3.5 w-3.5" />
      </LinkButton>

      <LinkButton
        href={`/clinical-notes?patient=${patientId}&appointment=${appointmentId}`}
        variant="ghost"
        size="icon-xs"
        title="Add Note"
        className="h-7 w-7 rounded-full"
      >
        <ClipboardList className="h-3.5 w-3.5" />
      </LinkButton>

      <LinkButton
        href={`/patients/${patientId}?tab=timeline`}
        variant="ghost"
        size="icon-xs"
        title="History"
        className="h-7 w-7 rounded-full"
      >
        <History className="h-3.5 w-3.5" />
      </LinkButton>

      <LinkButton
        href={`/patients/${patientId}?tab=labs`}
        variant="ghost"
        size="icon-xs"
        title="Lab Reports"
        className="h-7 w-7 rounded-full"
      >
        <TestTubeDiagonal className="h-3.5 w-3.5" />
      </LinkButton>
    </div>
  )
}
