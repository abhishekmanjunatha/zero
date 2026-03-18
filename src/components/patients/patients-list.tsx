'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  UserPlus,
  ChevronRight,
  User,
  Pencil,
  X,
  AlertTriangle,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContactPickerButton } from '@/components/shared/contact-picker-button'
import { cn } from '@/lib/utils'

interface PatientsListProps {
  patients: Tables<'patients'>[]
  searchQuery: string
  fetchError?: string | null
}

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Weight Loss',
  muscle_gain: 'Muscle Gain',
  maintenance: 'Maintenance',
  condition_management: 'Condition Management',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PatientsList({ patients, searchQuery, fetchError }: PatientsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(searchQuery)
  const [, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value)
    startTransition(() => {
      const params = new URLSearchParams()
      if (value.trim()) params.set('q', value.trim())
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setQuery('')
    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <div className="space-y-3.5">
      {/* Top bar: search + add */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, or patient ID..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-full rounded-2xl border border-border bg-background/80 pl-9 pr-16 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground"
            autoComplete="off"
          />
          <ContactPickerButton
            className="absolute right-10 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            ariaLabel="Pick contact to search patient"
            onContactPicked={({ phone }) => {
              handleSearch(phone)
            }}
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Link
          href="/patients/new"
          className={cn(buttonVariants({ variant: 'default' }), 'bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0 rounded-full px-5')}
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </Link>
      </div>

      {/* Table */}
      {fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-xl bg-card">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="text-xs text-muted-foreground">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={() => router.refresh()} className="mt-1">
            Try again
          </Button>
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <User className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium">
            {query ? `No patients matching "${query}"` : 'No patients found'}
          </p>
          {!query && <p className="text-xs">Start by adding a new patient.</p>}
          {!query && (
            <Link
              href="/patients/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1 gap-2')}
            >
              <UserPlus className="h-4 w-4" />
              Add Patient
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border overflow-hidden bg-card/90">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Patient</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Phone</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Primary Goal</th>
                  <th className="text-left font-medium px-4 py-2.5 text-muted-foreground">Last Visit</th>
                  <th className="text-right font-medium px-4 py-2.5 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground">{p.patient_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{p.phone}</td>
                    <td className="px-4 py-2.5">
                      {p.primary_goal ? (
                        <Badge variant="secondary" className="font-normal">
                          {GOAL_LABELS[p.primary_goal] ?? p.primary_goal}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDate(p.last_visit_at)}
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/patients/${p.id}`}
                          title="Open Profile"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'rounded-xl')}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/patients/${p.id}/edit`}
                          title="Edit Patient"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'rounded-xl')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-1.5">
            {patients.map((p) => (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-card/90 hover:bg-accent/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.patient_code} · {p.phone}
                  </p>
                  {p.last_visit_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last visit: {formatDate(p.last_visit_at)}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
