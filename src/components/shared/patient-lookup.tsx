'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Search, User, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ContactPickerButton } from '@/components/shared/contact-picker-button'
import { useDebounce } from '@/hooks/use-debounce'
import { cn } from '@/lib/utils'

export interface PatientLookupResult {
  id: string
  full_name: string
  patient_code: string
  phone: string | null
}

interface PatientLookupProps {
  value: string
  onValueChange: (value: string) => void
  onSelect: (patient: PatientLookupResult) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  limit?: number
  ariaLabel?: string
  emptyMessage?: string
}

export function PatientLookup({
  value,
  onValueChange,
  onSelect,
  placeholder = 'Search by name, phone, or patient ID...',
  className,
  inputClassName,
  limit = 8,
  ariaLabel = 'Search patients',
  emptyMessage = 'No patients found',
}: PatientLookupProps) {
  const listId = useId()
  const [results, setResults] = useState<PatientLookupResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedValue = useDebounce(value, 250)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!debouncedValue.trim()) {
      setResults([])
      setOpen(false)
      setActiveIndex(-1)
      return
    }

    const searchPatients = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const term = debouncedValue.trim()

        const { data } = await supabase
          .from('patients')
          .select('id, full_name, patient_code, phone')
          .or(`full_name.ilike.%${term}%,patient_code.ilike.%${term}%,phone.ilike.%${term}%`)
          .limit(limit)

        const nextResults = (data as PatientLookupResult[]) ?? []
        setResults(nextResults)
        setOpen(true)
        setActiveIndex(nextResults.length > 0 ? 0 : -1)
      } catch {
        setResults([])
        setActiveIndex(-1)
      } finally {
        setLoading(false)
      }
    }

    searchPatients()
  }, [debouncedValue, limit])

  const handleSelect = (patient: PatientLookupResult) => {
    onSelect(patient)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (results.length > 0) {
        event.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }

    if (!open) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const next = results[activeIndex]
      if (next) {
        handleSelect(next)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setOpen(true)
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'h-11 w-full rounded-2xl border bg-background pl-9 pr-16 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground',
            inputClassName
          )}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `${listId}-option-${results[activeIndex].id}`
              : undefined
          }
        />

        <ContactPickerButton
          className="absolute right-10 h-7 w-7 p-0"
          ariaLabel="Pick contact to search patient"
          onContactPicked={({ phone }) => {
            onValueChange(phone)
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange('')
              setOpen(false)
              setResults([])
              setActiveIndex(-1)
              inputRef.current?.focus()
            }}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md"
        >
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Searching…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto">
              {results.map((patient, index) => (
                <li key={patient.id}>
                  <button
                    id={`${listId}-option-${patient.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                      index === activeIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground',
                      index === 0 && 'rounded-t-lg',
                      index === results.length - 1 && 'rounded-b-lg'
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(patient)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.patient_code}
                        {patient.phone && <span> · {patient.phone}</span>}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
