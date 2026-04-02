'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarPlus,
  FileText,
  Filter,
  FlaskConical,
  Settings2,
  UserPlus,
} from 'lucide-react'
import type { AppointmentWithPatient } from '@/actions/appointments'
import { cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput, UnderlineTabs, DateRangePicker, ExportButton } from '@/components/shared/filter-toolbar'
import type { SegmentedTab } from '@/components/shared/filter-toolbar'

type FilterKey = 'today' | 'upcoming' | 'completed'
type ModeKey = 'all' | 'scheduled' | 'walk_in'

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
]

const MODE_FILTERS: Array<{ key: ModeKey; label: string }> = [
  { key: 'all', label: 'All Modes' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'walk_in', label: 'Walk-in' },
]

const PURPOSE_LABELS: Record<string, string> = {
  new_consultation: 'New Consultation',
  follow_up: 'Follow-up',
  review_with_report: 'Review with Report',
  custom: 'Custom',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
}

function toCsvSafe(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

interface AppointmentsPageToolbarProps {
  activeFilter: FilterKey
  initialQuery: string
  initialDateFrom: string
  initialDateTo: string
  initialMode: ModeKey
  appointmentsForExport: AppointmentWithPatient[]
}

export function AppointmentsPageToolbar({
  activeFilter,
  initialQuery,
  initialDateFrom,
  initialDateTo,
  initialMode,
  appointmentsForExport,
}: AppointmentsPageToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [searchText, setSearchText] = useState(initialQuery)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [mode, setMode] = useState<ModeKey>(initialMode)
  const [, setIsDatePickerOpen] = useState(false)
  const [isModeFilterOpen, setIsModeFilterOpen] = useState(false)
  const [isViewSettingsOpen, setIsViewSettingsOpen] = useState(false)

  const appliedRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return 'Date Range'
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`
    if (dateFrom) return `From ${dateFrom}`
    return `Until ${dateTo}`
  }, [dateFrom, dateTo])

  const updateQuery = (
    nextFilter: FilterKey,
    nextSearch: string,
    nextDateFrom: string,
    nextDateTo: string,
    nextMode: ModeKey
  ) => {
    const params = new URLSearchParams()
    const trimmed = nextSearch.trim()
    if (nextFilter !== 'today') params.set('filter', nextFilter)
    if (trimmed) params.set('q', trimmed)
    if (nextDateFrom) params.set('from', nextDateFrom)
    if (nextDateTo) params.set('to', nextDateTo)
    if (nextMode !== 'all') params.set('mode', nextMode)

    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const handleFilterChange = (key: FilterKey) => {
    setIsDatePickerOpen(false)
    setIsModeFilterOpen(false)
    setIsViewSettingsOpen(false)
    startTransition(() => {
      updateQuery(key, searchText, dateFrom, dateTo, mode)
    })
  }

  const handleSearchChange = (value: string) => {
    setSearchText(value)
    startTransition(() => {
      updateQuery(activeFilter, value, dateFrom, dateTo, mode)
    })
  }

  const clearSearch = () => {
    setSearchText('')
    startTransition(() => {
      updateQuery(activeFilter, '', dateFrom, dateTo, mode)
    })
  }

  const applyDateRange = () => {
    setIsDatePickerOpen(false)
    startTransition(() => {
      updateQuery(activeFilter, searchText, dateFrom, dateTo, mode)
    })
  }

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setIsDatePickerOpen(false)
    startTransition(() => {
      updateQuery(activeFilter, searchText, '', '', mode)
    })
  }

  const applyModeFilter = (nextMode: ModeKey) => {
    setMode(nextMode)
    setIsModeFilterOpen(false)
    startTransition(() => {
      updateQuery(activeFilter, searchText, dateFrom, dateTo, nextMode)
    })
  }

  const clearAllControls = () => {
    setSearchText('')
    setDateFrom('')
    setDateTo('')
    setMode('all')
    setIsDatePickerOpen(false)
    setIsModeFilterOpen(false)
    setIsViewSettingsOpen(false)
    startTransition(() => {
      updateQuery('today', '', '', '', 'all')
    })
  }

  const handleExportCsv = () => {
    const headers = [
      'Patient',
      'Patient ID',
      'Phone',
      'Purpose',
      'Mode',
      'Date',
      'Time',
      'Status',
    ]

    const rows = appointmentsForExport.map((appt) => {
      const purposeLabel =
        appt.purpose === 'custom' && appt.custom_purpose
          ? appt.custom_purpose
          : PURPOSE_LABELS[appt.purpose] ?? appt.purpose

      return [
        appt.patient.full_name,
        appt.patient.patient_code,
        appt.patient.phone,
        purposeLabel,
        appt.mode === 'walk_in' ? 'Walk-in' : 'Scheduled',
        formatDate(appt.appointment_date),
        formatTime(appt.appointment_time),
        appt.status,
      ]
    })

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => toCsvSafe(String(cell ?? ''))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `appointments-${stamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-6">
      <div className="hidden lg:block">
        <div className="mb-7">
          <PageHeader
            title="Appointments"
            subtitle="Manage and schedule clinical sessions for your patients."
            actions={
              <LinkButton
                href="/appointments/new"
                variant="cta"
                size="lg"
                className="gap-2 px-6 font-bold"
              >
                <CalendarPlus className="h-4 w-4" />
                New Appointment
              </LinkButton>
            }
          />
        </div>

        <div className="relative rounded-2xl bg-white shadow-[0_12px_32px_-4px_rgba(25,28,29,0.04)]">
          <div className="border-b border-outline-variant/20 px-8 pt-6">
            <UnderlineTabs
              tabs={FILTER_TABS as unknown as SegmentedTab<FilterKey>[]}
              active={activeFilter}
              onChange={handleFilterChange}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
            <div className="flex min-w-[300px] flex-1 items-center gap-3">
              <SearchInput
                value={searchText}
                onChange={handleSearchChange}
                onClear={clearSearch}
                placeholder="Patient name or ID..."
                className="w-full max-w-sm"
              />

              <DateRangePicker
                label={appliedRangeLabel}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onApply={applyDateRange}
                onClear={clearDateRange}
                dateLabel="Appointment Date Range"
              />
            </div>

            <div className="relative flex items-center gap-2">
              <ExportButton onClick={handleExportCsv} />
              <div className="mx-2 h-8 w-px bg-outline-variant/20" />
              <button
                type="button"
                onClick={() => {
                  setIsModeFilterOpen((prev) => !prev)
                  setIsDatePickerOpen(false)
                  setIsViewSettingsOpen(false)
                }}
                className="rounded-lg p-2.5 text-on-surface-variant hover:bg-surface-container"
                title="Filter settings"
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewSettingsOpen((prev) => !prev)
                  setIsDatePickerOpen(false)
                  setIsModeFilterOpen(false)
                }}
                className="rounded-lg p-2.5 text-on-surface-variant hover:bg-surface-container"
                title="View settings"
              >
                <Settings2 className="h-4 w-4" />
              </button>

              {isModeFilterOpen && (
                <div className="absolute right-0 top-12 z-50 w-[220px] rounded-xl border border-outline-variant bg-white p-3 shadow-lg">
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Mode Filter</p>
                  <div className="space-y-1">
                    {MODE_FILTERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => applyModeFilter(item.key)}
                        className={cn(
                          'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          mode === item.key
                            ? 'bg-primary font-semibold text-white'
                            : 'text-on-surface-variant hover:bg-surface-container'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isViewSettingsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[240px] rounded-xl border border-outline-variant bg-white p-3 shadow-lg">
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant">View Settings</p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={clearAllControls}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                    >
                      Reset filters and search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsViewSettingsOpen(false)
                        router.refresh()
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface-variant hover:bg-surface-container"
                    >
                      Refresh appointments
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <LinkButton
          href="/appointments/new"
          variant="cta"
          className="h-14 w-full gap-2 rounded-2xl text-base font-bold"
        >
          <CalendarPlus className="h-5 w-5" />
          New Appointment
        </LinkButton>

        <div className="flex items-center gap-1 rounded-2xl bg-surface-container-high p-1">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleFilterChange(key)}
              className={cn(
                'flex-1 rounded-xl px-3 py-2.5 text-sm transition-all',
                activeFilter === key
                  ? 'bg-white font-semibold text-primary shadow-sm'
                  : 'font-medium text-on-surface-variant'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 px-1">
          <Link href="/patients/new" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <UserPlus className="h-5 w-5" />
          </Link>
          <Link href="/lab-reports/upload" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <FlaskConical className="h-5 w-5" />
          </Link>
          <Link href="/templates" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <FileText className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
