'use client'

import Link from 'next/link'
import {
  Activity,
  CalendarClock,
  ArrowRight,
  ChevronRight,
  User,
} from 'lucide-react'
import type { DashboardStats, RecentActivityEvent, RecentPatient } from '@/actions/dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

interface DashboardSecondaryPanelsProps {
  recentPatients: RecentPatient[]
  recentActivity: RecentActivityEvent[]
  stats: DashboardStats
}

const EVENT_LABELS: Record<string, string> = {
  appointment_completed: 'Completed appointment',
  appointment_checked_in: 'Patient checked in',
  appointment_in_progress: 'Appointment in progress',
  appointment_cancelled: 'Appointment cancelled',
  appointment_no_show: 'No-show recorded',
  appointment_created: 'Appointment scheduled',
  document_created: 'Clinical note created',
  document_updated: 'Clinical note updated',
  lab_report_uploaded: 'Lab report uploaded',
  patient_created: 'New patient registered',
}

function relativeTime(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatLastSeenRelative(dateStr: string | null) {
  if (!dateStr) return 'Recently added'
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays <= 0) return 'Last seen today'
  if (diffDays === 1) return 'Last seen yesterday'
  return `Last seen ${diffDays} days ago`
}

export function DashboardSecondaryPanels({
  recentPatients,
  recentActivity,
  stats,
}: DashboardSecondaryPanelsProps) {
  const topPatients = recentPatients.slice(0, 3)
  const topActivity = recentActivity.slice(0, 3)

  return (
    <section>
      <Tabs defaultValue="patients" className="gap-3">
        <TabsList className="h-12 w-full rounded-2xl bg-surface-container-high p-1">
          <TabsTrigger
            id="mobile-dashboard-tab-patients"
            value="patients"
            className="rounded-xl border-none bg-transparent px-3 py-2 text-sm font-medium text-on-surface-variant data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_rgba(34,71,101,0.18)]"
          >
            Patients
          </TabsTrigger>
          <TabsTrigger
            id="mobile-dashboard-tab-activity"
            value="activity"
            className="rounded-xl border-none bg-transparent px-3 py-2 text-sm font-medium text-on-surface-variant data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_rgba(34,71,101,0.18)]"
          >
            Activity
          </TabsTrigger>
          <TabsTrigger
            id="mobile-dashboard-tab-followups"
            value="followups"
            className="rounded-xl border-none bg-transparent px-3 py-2 text-sm font-medium text-on-surface-variant data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-[0_2px_8px_rgba(34,71,101,0.18)]"
          >
            Follow-ups
          </TabsTrigger>
        </TabsList>

        <TabsContent id="mobile-dashboard-panel-patients" value="patients" className="m-0">
          <div className="overflow-hidden rounded-3xl border border-outline-variant bg-white shadow-[0_10px_24px_rgba(25,28,29,0.04)]">
            {topPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-outline">
                <User className="h-6 w-6 opacity-50" />
                <p className="text-sm">No recent patients</p>
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {topPatients.map((patient) => (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-container-low/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-container text-base font-semibold text-primary">
                        {patient.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-on-surface">{patient.full_name}</p>
                        <p className="truncate text-sm text-on-surface-variant">
                          {formatLastSeenRelative(patient.last_visit_at)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-on-surface-variant transition-colors group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-outline-variant/40 bg-surface-container-low px-4 py-4">
              <Link href="/patients" className="group flex items-center justify-between text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                View Full Patient Directory
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent id="mobile-dashboard-panel-activity" value="activity" className="m-0">
          <div className="overflow-hidden rounded-3xl border border-outline-variant bg-white p-4 shadow-[0_10px_24px_rgba(25,28,29,0.04)]">
            {topActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-outline">
                <Activity className="h-6 w-6 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {topActivity.map((event) => (
                  <li key={event.id}>
                    <Link href={`/patients/${event.patient_id}`} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{event.patient_name}</p>
                        <p className="text-xs text-on-surface-variant">{EVENT_LABELS[event.event_type] ?? 'Activity update'} · {relativeTime(event.created_at)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent id="mobile-dashboard-panel-followups" value="followups" className="m-0">
          <div className="space-y-3">
          <CollapsibleSection
            title="Pending Follow-ups"
            count={stats.pendingFollowUps}
            defaultOpen={stats.pendingFollowUps > 0}
            className="rounded-2xl border border-outline-variant bg-white shadow-[0_10px_24px_rgba(25,28,29,0.04)]"
            contentClassName="px-4 pb-4"
          >
            <Link
              href="/appointments?filter=upcoming"
              className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">Patients needing follow-up scheduling</p>
              </div>
              <ChevronRight className="h-4 w-4 text-outline-variant" />
            </Link>
          </CollapsibleSection>

          <CollapsibleSection
            title="Upcoming Next 7 Days"
            count={stats.upcomingNext7Days}
            defaultOpen={true}
            className="rounded-2xl border border-outline-variant bg-white shadow-[0_10px_24px_rgba(25,28,29,0.04)]"
            contentClassName="px-4 pb-4"
          >
            <Link
              href="/appointments?filter=upcoming"
              className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">Prepare upcoming consultations</p>
              </div>
              <ChevronRight className="h-4 w-4 text-outline-variant" />
            </Link>
          </CollapsibleSection>

          <CollapsibleSection
            title="Completed This Week"
            count={stats.completedThisWeek}
            defaultOpen={false}
            className="rounded-2xl border border-outline-variant bg-white shadow-[0_10px_24px_rgba(25,28,29,0.04)]"
            contentClassName="px-4 pb-4"
          >
            <Link
              href="/appointments?filter=completed"
              className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">Recent consults closed this week</p>
              </div>
              <ChevronRight className="h-4 w-4 text-outline-variant" />
            </Link>
          </CollapsibleSection>

          <Link
            href="/appointments"
            className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-white"
          >
            <CalendarClock className="h-4 w-4" />
            Open Appointments Board
          </Link>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
