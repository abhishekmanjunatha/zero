export type AppointmentStatus =
  | 'upcoming'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

interface AppointmentStatusMeta {
  label: string
  badgeClassName: string
}

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, AppointmentStatusMeta> = {
  upcoming: {
    label: 'Upcoming',
    badgeClassName: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  checked_in: {
    label: 'Checked In',
    badgeClassName: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  in_progress: {
    label: 'In Progress',
    badgeClassName: 'bg-primary/15 text-primary border-primary/30',
  },
  completed: {
    label: 'Completed',
    badgeClassName: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClassName: 'bg-red-100 text-red-600 border-red-200',
  },
  no_show: {
    label: 'No Show',
    badgeClassName: 'bg-orange-100 text-orange-700 border-orange-200',
  },
}

export function getAppointmentStatusMeta(status: string): AppointmentStatusMeta {
  if (status in APPOINTMENT_STATUS_META) {
    return APPOINTMENT_STATUS_META[status as AppointmentStatus]
  }
  return APPOINTMENT_STATUS_META.upcoming
}
