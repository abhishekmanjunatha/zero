'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  Filter,
  FlaskConical,
  Search,
  UserPlus,
  X,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput, SegmentedTabs, DateRangePicker, ExportButton } from '@/components/shared/filter-toolbar'
import type { SegmentedTab } from '@/components/shared/filter-toolbar'
import { InvitePatientToolbarButton } from '@/components/patients/invite-patient-button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type PatientsFilterMode = 'all' | 'appointments' | 'labs' | 'notes'
type PageView = 'directory' | 'invites'

interface PatientsPageToolbarProps {
  initialQuery: string
  initialMode: PatientsFilterMode
  initialDateFrom: string
  initialDateTo: string
  patientsForExport: Tables<'patients'>[]
  action?: 'upload-lab' | 'write-note' | 'create-appointment'
  view?: PageView
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

function toCsvSafe(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PatientsPageToolbar({
  initialQuery,
  initialMode,
  initialDateFrom,
  initialDateTo,
  patientsForExport,
  action,
  view = 'directory',
}: PatientsPageToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [mode, setMode] = useState<PatientsFilterMode>(initialMode)
  const [, setIsDatePickerOpen] = useState(false)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)

  const appliedRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'Date Range'
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`
    if (dateFrom) return `From ${dateFrom}`
    return `Until ${dateTo}`
  }, [dateFrom, dateTo])

  const updateQuery = (
    nextQuery: string,
    nextMode: PatientsFilterMode,
    nextDateFrom: string,
    nextDateTo: string
  ) => {
    const trimmed = nextQuery.trim()
    const params = new URLSearchParams()
    if (trimmed) params.set('q', trimmed)
    if (nextMode !== 'all') params.set('mode', nextMode)
    if (nextDateFrom) params.set('from', nextDateFrom)
    if (nextDateTo) params.set('to', nextDateTo)
    if (action) params.set('action', action)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const handleSearchChange = (nextQuery: string) => {
    setQuery(nextQuery)
    startTransition(() => {
      updateQuery(nextQuery, mode, dateFrom, dateTo)
    })
  }

  const handleModeChange = (nextMode: PatientsFilterMode) => {
    setMode(nextMode)
    startTransition(() => {
      updateQuery(query, nextMode, dateFrom, dateTo)
    })
  }

  const handleClear = () => {
    setQuery('')
    startTransition(() => {
      updateQuery('', mode, dateFrom, dateTo)
    })
  }

  const applyDateRange = () => {
    setIsDatePickerOpen(false)
    startTransition(() => {
      updateQuery(query, mode, dateFrom, dateTo)
    })
  }

  const applyMobileFilters = () => {
    setIsMobileFiltersOpen(false)
    startTransition(() => {
      updateQuery(query, mode, dateFrom, dateTo)
    })
  }

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setIsDatePickerOpen(false)
    startTransition(() => {
      updateQuery(query, mode, '', '')
    })
  }

  const clearMobileFilters = () => {
    setMode('all')
    setDateFrom('')
    setDateTo('')
    setIsMobileFiltersOpen(false)
    startTransition(() => {
      updateQuery(query, 'all', '', '')
    })
  }

  const handleViewChange = (nextView: PageView) => {
    if (nextView === view) return
    const params = new URLSearchParams()
    if (nextView !== 'directory') params.set('view', nextView)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const VIEW_TABS: SegmentedTab<PageView>[] = [
    { key: 'directory', label: 'Directory' },
    { key: 'invites', label: 'Invites' },
  ]

  const handleExportCsv = () => {
    const headers = [
      'Patient',
      'Patient ID',
      'Phone Number',
      'Primary Goal',
      'Last Visit',
    ]

    const rows = patientsForExport.map((patient) => [
      patient.full_name,
      patient.patient_code,
      patient.phone,
      patient.primary_goal ? GOAL_LABELS[patient.primary_goal] ?? patient.primary_goal : '',
      formatDate(patient.last_visit_at),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => toCsvSafe(String(cell ?? ''))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `patients-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const MODE_TABS: SegmentedTab<PatientsFilterMode>[] = [
    { key: 'all', label: 'All' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'labs', label: 'Labs' },
    { key: 'notes', label: 'Notes' },
  ]

  return (
    <section className="space-y-4">
      <div className="hidden lg:block">
        <div className="mb-8">
          <PageHeader
            title="Patients"
            breadcrumbs={[{ label: 'Directory' }, { label: view === 'invites' ? 'Invites' : 'Patients' }]}
            actions={
              <div className="flex items-center gap-3">
                <SegmentedTabs tabs={VIEW_TABS} active={view} onChange={handleViewChange} />
                <InvitePatientToolbarButton variant="desktop" />
                <LinkButton
                  href="/patients/new"
                  variant="cta"
                  size="lg"
                  className="gap-2 px-6 font-bold"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Patient
                </LinkButton>
              </div>
            }
          />
        </div>

        {view === 'directory' && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4">
            <div className="flex flex-wrap items-center gap-4">
              <SearchInput
                value={query}
                onChange={handleSearchChange}
                onClear={handleClear}
                placeholder="Filter patient name or ID..."
                disabled={isPending}
                className="min-w-[320px]"
              />
              <SegmentedTabs tabs={MODE_TABS} active={mode} onChange={handleModeChange} />
            </div>

            <div className="flex items-center gap-3">
              <DateRangePicker
                label={appliedRangeLabel}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onApply={applyDateRange}
                onClear={clearDateRange}
                disabled={isPending}
                dateLabel="Last Visit Date Range"
              />
              <ExportButton onClick={handleExportCsv} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 lg:hidden">
        {/* Mobile view toggle */}
        <div className="flex items-center gap-1 rounded-2xl bg-surface-container-high p-1">
          {VIEW_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleViewChange(key)}
              className={cn(
                'flex-1 rounded-xl px-3 py-2.5 text-sm transition-all',
                view === key
                  ? 'bg-white font-semibold text-primary shadow-sm'
                  : 'font-medium text-on-surface-variant'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'directory' && (
          <>
            <LinkButton
              href="/patients/new"
              variant="cta"
              className="h-14 w-full gap-3 rounded-2xl text-base font-bold"
            >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary-container">
            <UserPlus className="h-5 w-5" />
          </span>
          Add Patient
        </LinkButton>

        <div className="space-y-4">
          <div className="relative h-12">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by name, phone, or patient ID..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-full w-full rounded-2xl border-none bg-surface-container-low pl-11 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
              autoComplete="off"
              aria-label="Search patients"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-foreground"
                aria-label="Clear search"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex gap-3">
              <Link href="/appointments/new" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/20 bg-white text-primary shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </Link>
              <Link href="/lab-reports/upload" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/20 bg-white text-primary shadow-sm">
                <FlaskConical className="h-5 w-5" />
              </Link>
              <Link href="/templates" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/20 bg-white text-primary shadow-sm">
                <FileText className="h-5 w-5" />
              </Link>
              <InvitePatientToolbarButton variant="mobile" />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold text-primary"
            >
              <Filter className="h-4 w-4" />
              All Filters
            </button>
          </div>
        </div>

        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl border-t border-outline-variant px-4 pb-6 pt-2" showCloseButton={false}>
            <SheetHeader className="px-0 pb-2 pt-3">
              <SheetTitle className="text-base font-bold text-on-surface">Filter Patients</SheetTitle>
            </SheetHeader>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'appointments', label: 'Appointments' },
                    { key: 'labs', label: 'Labs' },
                    { key: 'notes', label: 'Notes' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMode(item.key as PatientsFilterMode)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                        mode === item.key
                          ? 'border-primary bg-primary text-white'
                          : 'border-outline-variant bg-white text-on-surface-variant'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Last Visit Date</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-on-surface-variant">
                    From
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-outline-variant px-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="text-xs font-medium text-on-surface-variant">
                    To
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-outline-variant px-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={clearMobileFilters}
                  className="h-11 flex-1 rounded-xl border border-outline-variant/40 bg-white text-sm font-semibold text-on-surface-variant"
                  disabled={isPending}
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={applyMobileFilters}
                  className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-white"
                  disabled={isPending}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
          </>
        )}
      </div>
    </section>
  )
}
