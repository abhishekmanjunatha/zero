import { Sparkles } from 'lucide-react'
import type { DietitianGreeting } from '@/actions/dashboard'
import { CLINIC_TIME_ZONE } from '@/lib/utils/timezone'

function getGreeting(timeZone: string): string {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false }).format(
      new Date()
    ),
    10
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayFormatted(timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

interface DashboardGreetingProps {
  greeting: DietitianGreeting
}

export function DashboardGreeting({ greeting }: DashboardGreetingProps) {
  const firstName = greeting.fullName.split(' ')[0] || greeting.fullName
  const greetingText = getGreeting(CLINIC_TIME_ZONE)
  const todayFormatted = getTodayFormatted(CLINIC_TIME_ZONE)

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-emerald-100/40 p-3 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="pointer-events-none absolute -left-16 -top-16 hidden h-40 w-40 rounded-full bg-primary/15 blur-2xl sm:block" />
      <div className="pointer-events-none absolute -bottom-24 right-0 hidden h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl sm:block" />

      <div className="relative">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 inline-flex items-center gap-1 rounded-full border border-primary/25 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-primary backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Clinic Pulse
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
              {greetingText}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">{todayFormatted}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
