import Link from 'next/link'
import {
  CalendarPlus,
  NotebookPen,
  FlaskConical,
  UserPlus,
} from 'lucide-react'
import type { DashboardStats } from '@/actions/dashboard'
import { cn } from '@/lib/utils'

interface DashboardActionHubProps {
  stats: DashboardStats
}

interface QuickAction {
  title: string
  href: string
  icon: React.ReactNode
  tone: string
  badge?: string
}

function QuickActionChip({ action }: { action: QuickAction }) {
  return (
    <Link
      href={action.href}
      className="group relative flex min-h-32 flex-col justify-between rounded-3xl border border-outline-variant/70 bg-white p-4 shadow-[0_10px_24px_rgba(25,28,29,0.04)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            action.tone
          )}
        >
          {action.icon}
        </div>
      </div>

      {action.badge && (
        <span className="absolute right-4 top-4 shrink-0 rounded-full bg-tertiary-fixed/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-tertiary">
          {action.badge}
        </span>
      )}

      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-on-surface">{action.title}</p>
      </div>
    </Link>
  )
}

export function DashboardActionHub({ stats }: DashboardActionHubProps) {
  const quickActions: QuickAction[] = [
    {
      title: 'Add Patient',
      href: '/patients/new',
      icon: <UserPlus className="h-5 w-5 text-primary" />,
      tone: 'bg-secondary-container',
    },
    {
      title: 'Book Slot',
      href: '/appointments/new',
      icon: <CalendarPlus className="h-5 w-5 text-primary" />,
      tone: 'bg-secondary-container',
      badge: `${stats.todayCount} TODAY`,
    },
    {
      title: 'Upload Lab',
      href: '/lab-reports/upload',
      icon: <FlaskConical className="h-5 w-5 text-tertiary" />,
      tone: 'bg-tertiary-fixed/30',
    },
    {
      title: 'Write Note',
      href: '/clinical-notes/new',
      icon: <NotebookPen className="h-5 w-5 text-amber-700" />,
      tone: 'bg-amber-100',
    },
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight text-on-surface">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <QuickActionChip key={action.title} action={action} />
        ))}
      </div>
    </section>
  )
}
