import Link from 'next/link'
import { CalendarDays, Users, RefreshCcw, CheckCircle2, CalendarClock } from 'lucide-react'
import type { DashboardStats } from '@/actions/dashboard'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  iconBg: string
  href?: string
  accent?: string
}

function StatCard({ label, value, icon, iconBg, href, accent }: StatCardProps) {
  const inner = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/40 bg-card/95 p-4 shadow-sm transition-all duration-200',
        href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-border/40', iconBg)}>
          {icon}
        </div>
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums tracking-tight',
            accent ?? 'text-foreground'
          )}
        >
          {value}
        </span>
      </div>
      <p className="text-xs font-medium leading-tight text-muted-foreground">{label}</p>
    </div>
  )

  if (href) {
    return <Link href={href}>{inner}</Link>
  }
  return inner
}

interface DashboardStatsProps {
  stats: DashboardStats
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Today's Appointments"
        value={stats.todayCount}
        icon={<CalendarDays className="h-4.5 w-4.5 text-primary" />}
        iconBg="bg-primary/10"
        href="/appointments?filter=today"
        accent="text-primary"
      />
      <StatCard
        label="Total Patients"
        value={stats.totalPatients}
        icon={<Users className="h-4.5 w-4.5 text-sky-600" />}
        iconBg="bg-sky-50 dark:bg-sky-950/40"
        href="/patients"
        accent="text-sky-600"
      />
      <StatCard
        label="Pending Follow-ups"
        value={stats.pendingFollowUps}
        icon={<RefreshCcw className="h-4.5 w-4.5 text-amber-600" />}
        iconBg="bg-amber-50 dark:bg-amber-950/40"
        href="/appointments?filter=upcoming"
        accent="text-amber-600"
      />
      <StatCard
        label="Completed This Week"
        value={stats.completedThisWeek}
        icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />}
        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        accent="text-emerald-600"
      />
      <StatCard
        label="Upcoming (Next 7 Days)"
        value={stats.upcomingNext7Days}
        icon={<CalendarClock className="h-4.5 w-4.5 text-violet-600" />}
        iconBg="bg-violet-50 dark:bg-violet-950/40"
        accent="text-violet-600"
      />
    </div>
  )
}
