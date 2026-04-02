import Link from 'next/link'
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  ClipboardList,
  FileText,
  FlaskConical,
  UserPlus,
  Activity,
  ChevronRight,
} from 'lucide-react'
import type { RecentActivityEvent } from '@/actions/dashboard'
import { cn } from '@/lib/utils'

// ─── Event metadata ─────────────────────────────────────────────────────────

interface EventMeta {
  icon: React.ReactNode
  iconBg: string
  label: (patientName: string) => string
}

const EVENT_MAP: Record<string, EventMeta> = {
  appointment_completed: {
    icon: <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    label: (n) => `Completed appointment with ${n}`,
  },
  appointment_checked_in: {
    icon: <CalendarClock className="h-3.5 w-3.5 text-indigo-600" />,
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    label: (n) => `${n} checked in`,
  },
  appointment_in_progress: {
    icon: <CalendarClock className="h-3.5 w-3.5 text-primary" />,
    iconBg: 'bg-primary/10',
    label: (n) => `Appointment in progress with ${n}`,
  },
  appointment_cancelled: {
    icon: <CalendarX className="h-3.5 w-3.5 text-red-500" />,
    iconBg: 'bg-red-50 dark:bg-red-950/40',
    label: (n) => `Appointment cancelled for ${n}`,
  },
  appointment_no_show: {
    icon: <CalendarX className="h-3.5 w-3.5 text-orange-500" />,
    iconBg: 'bg-orange-50 dark:bg-orange-950/40',
    label: (n) => `${n} did not show up`,
  },
  appointment_created: {
    icon: <CalendarClock className="h-3.5 w-3.5 text-sky-600" />,
    iconBg: 'bg-sky-50 dark:bg-sky-950/40',
    label: (n) => `Appointment scheduled for ${n}`,
  },
  document_created: {
    icon: <ClipboardList className="h-3.5 w-3.5 text-violet-600" />,
    iconBg: 'bg-violet-50 dark:bg-violet-950/40',
    label: (n) => `Clinical note created for ${n}`,
  },
  document_updated: {
    icon: <FileText className="h-3.5 w-3.5 text-violet-500" />,
    iconBg: 'bg-violet-50 dark:bg-violet-950/40',
    label: (n) => `Clinical note updated for ${n}`,
  },
  lab_report_uploaded: {
    icon: <FlaskConical className="h-3.5 w-3.5 text-teal-600" />,
    iconBg: 'bg-teal-50 dark:bg-teal-950/40',
    label: (n) => `Lab report uploaded for ${n}`,
  },
  patient_created: {
    icon: <UserPlus className="h-3.5 w-3.5 text-primary" />,
    iconBg: 'bg-primary/10',
    label: (n) => `New patient registered: ${n}`,
  },
}

const DEFAULT_META: EventMeta = {
  icon: <Activity className="h-3.5 w-3.5 text-muted-foreground" />,
  iconBg: 'bg-muted/60',
  label: (n) => `Activity for ${n}`,
}

// ─── Relative time ────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Component ─────────────────────────────────────────────────────────────

interface RecentActivityProps {
  events: RecentActivityEvent[]
}

export function RecentActivity({ events }: RecentActivityProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/95 shadow-sm">
      <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex items-center justify-between border-b border-border/40 bg-background/40 px-4 py-3.5 backdrop-blur-sm">
        <div>
          <p className="text-sm font-semibold">Recent Activity</p>
          <p className="text-xs text-muted-foreground">Latest actions across your practice</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Activity className="mb-2 h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">Actions will appear here as you use the app</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {events.map((event) => {
            const meta = EVENT_MAP[event.event_type] ?? DEFAULT_META
            return (
              <li key={event.id}>
                <Link
                  href={`/patients/${event.patient_id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-border/30',
                      meta.iconBg
                    )}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-foreground">
                      {meta.label(event.patient_name)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {relativeTime(event.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
