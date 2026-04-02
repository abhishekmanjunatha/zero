'use client'

import { useState } from 'react'
import { CalendarDays, Download, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Segmented Tabs ---------- */

export interface SegmentedTab<T extends string> {
  key: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export function SegmentedTabs<T extends string>({ tabs, active, onChange, className }: SegmentedTabsProps<T>) {
  return (
    <div className={cn('flex rounded-lg bg-surface-container-high p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'rounded-md px-4 py-1.5 text-xs transition-colors',
            active === tab.key
              ? 'bg-white font-bold text-primary shadow-sm'
              : 'font-medium text-on-surface-variant hover:text-primary'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Underline Tabs ---------- */

interface UnderlineTabsProps<T extends string> {
  tabs: SegmentedTab<T>[]
  active: T
  onChange: (key: T) => void
  className?: string
}

export function UnderlineTabs<T extends string>({ tabs, active, onChange, className }: UnderlineTabsProps<T>) {
  return (
    <div className={cn('flex gap-10', className)}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'pb-4 text-sm transition-all',
            active === key
              ? 'border-b-2 border-primary font-bold text-primary'
              : 'font-medium text-on-surface-variant hover:text-primary'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Search Input ---------- */

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchInput({ value, onChange, onClear, placeholder = 'Search...', disabled, className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border-none bg-surface-container py-2 pl-10 pr-10 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary placeholder:text-outline"
        autoComplete="off"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-foreground"
          aria-label="Clear search"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/* ---------- Date Range Picker ---------- */

interface DateRangePickerProps {
  label: string
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onApply: () => void
  onClear: () => void
  disabled?: boolean
  dateLabel?: string
}

export function DateRangePicker({
  label,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
  disabled,
  dateLabel = 'Date Range',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="max-w-[170px] truncate">{label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[300px] rounded-xl border border-outline-variant bg-white p-4 shadow-lg">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-on-surface-variant">{dateLabel}</p>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-on-surface-variant">
              From
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-outline-variant px-2 text-xs outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs font-medium text-on-surface-variant">
              To
              <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-outline-variant px-2 text-xs outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { onClear(); setIsOpen(false) }}
                className="rounded-md border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface-variant"
                disabled={disabled}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => { onApply(); setIsOpen(false) }}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                disabled={disabled}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Export Button ---------- */

interface ExportButtonProps {
  onClick: () => void
  label?: string
}

export function ExportButton({ onClick, label = 'Export CSV' }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  )
}
