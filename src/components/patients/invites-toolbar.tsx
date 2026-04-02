'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { SegmentedTabs } from '@/components/shared/filter-toolbar'
import type { SegmentedTab } from '@/components/shared/filter-toolbar'
import type { InviteStatusFilter } from '@/actions/invites'

interface InvitesToolbarProps {
  initialQuery: string
  initialStatus: InviteStatusFilter
}

const STATUS_TABS: SegmentedTab<InviteStatusFilter>[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'expired', label: 'Expired' },
]

export function InvitesToolbar({ initialQuery, initialStatus }: InvitesToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState<InviteStatusFilter>(initialStatus)

  const updateUrl = (nextQuery: string, nextStatus: InviteStatusFilter) => {
    const params = new URLSearchParams()
    params.set('view', 'invites')
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus !== 'all') params.set('status', nextStatus)
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleSearchChange = (value: string) => {
    setQuery(value)
    startTransition(() => updateUrl(value, status))
  }

  const handleClear = () => {
    setQuery('')
    startTransition(() => updateUrl('', status))
  }

  const handleStatusChange = (next: InviteStatusFilter) => {
    setStatus(next)
    startTransition(() => updateUrl(query, next))
  }

  return (
    <div className="space-y-4">
      {/* Desktop */}
      <div className="hidden lg:flex flex-wrap items-center gap-4 rounded-xl bg-white p-4">
        <div className="relative min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by phone number…"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            disabled={isPending}
            className="h-10 w-full rounded-lg border-none bg-surface-container-high pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <SegmentedTabs tabs={STATUS_TABS} active={status} onChange={handleStatusChange} />
      </div>

      {/* Mobile */}
      <div className="space-y-3 lg:hidden">
        <div className="relative h-12">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by phone…"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-full w-full rounded-2xl border-none bg-surface-container-low pl-11 pr-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-outline"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-2xl bg-surface-container-high p-1">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleStatusChange(key)}
              className={
                'flex-1 rounded-xl px-3 py-2.5 text-sm transition-all ' +
                (status === key
                  ? 'bg-white font-semibold text-primary shadow-sm'
                  : 'font-medium text-on-surface-variant')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
