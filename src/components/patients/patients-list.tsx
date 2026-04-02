'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  FlaskConical,
  NotebookPen,
  CalendarPlus,
  User,
  Pencil,
  X,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { ListShell, DataTable, MobileCard, AvatarCircle } from '@/components/shared/list-shell'

type PatientAction = 'upload-lab' | 'write-note' | 'create-appointment'

interface PatientsListProps {
  patients: Tables<'patients'>[]
  searchQuery: string
  fetchError?: string | null
  action?: PatientAction
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

function getInitials(name: string | null) {
  if (!name) return 'PT'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase() || 'PT'
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

function getDemographicLabel(patient: Tables<'patients'>) {
  const genderMap = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  } as const

  const parts: string[] = []
  if (patient.gender) parts.push(genderMap[patient.gender])

  const age = getAge(patient.date_of_birth)
  if (age !== null) parts.push(`${age}y`)

  return parts.join(', ') || 'Patient record'
}

export function PatientsList({ patients, searchQuery, fetchError, action }: PatientsListProps) {
  const router = useRouter()

  /** Where to go when clicking a patient row, based on the action context */
  const getPatientHref = (patientId: string) => {
    switch (action) {
      case 'upload-lab':
        return `/patients/${patientId}/lab-reports/upload`
      case 'write-note':
        return `/clinical-notes/new?patient=${patientId}`
      case 'create-appointment':
        return `/appointments/new?patient=${patientId}`
      default:
        return `/patients/${patientId}`
    }
  }

  const ACTION_BANNER: Record<PatientAction, { icon: React.ReactNode; label: string }> = {
    'upload-lab': { icon: <FlaskConical className="h-4 w-4" />, label: 'Select a patient to upload lab report' },
    'write-note': { icon: <NotebookPen className="h-4 w-4" />, label: 'Select a patient to write a clinical note' },
    'create-appointment': { icon: <CalendarPlus className="h-4 w-4" />, label: 'Select a patient to schedule an appointment' },
  }

  return (
    <>
      {action && ACTION_BANNER[action] && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {ACTION_BANNER[action].icon}
          </div>
          <p className="flex-1 text-sm font-medium text-primary">{ACTION_BANNER[action].label}</p>
          <Link
            href="/patients"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-container-low hover:text-foreground"
            aria-label="Cancel action"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
      )}
      <ListShell
      isEmpty={patients.length === 0}
      error={fetchError}
      onRetry={() => router.refresh()}
      emptyIcon={<User className="h-7 w-7" />}
      emptyTitle={searchQuery ? `No patients matching "${searchQuery}"` : 'No patients found'}
      emptyHint={!searchQuery ? 'Use Add Patient in the page header to create your first record.' : undefined}
      desktopTable={
        <DataTable
          headers={
            <>
              <th className="px-5 py-3 text-left font-semibold">Patient ID</th>
              <th className="px-5 py-3 text-left font-semibold">Name</th>
              <th className="px-5 py-3 text-left font-semibold">Phone Number</th>
              <th className="px-5 py-3 text-left font-semibold">Primary Goal</th>
              <th className="px-5 py-3 text-left font-semibold">Last Visit</th>
              <th className="px-5 py-3 text-left font-semibold">Actions</th>
            </>
          }
          footer={
            <>
              <span>Showing {patients.length} patients</span>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-md border border-outline-variant/30 px-2 py-1 text-on-surface-variant">Previous</button>
                <button type="button" className="rounded-md border border-outline-variant/30 px-2 py-1 text-on-surface-variant">Next</button>
              </div>
            </>
          }
        >
          {patients.map((p) => (
            <tr
              key={p.id}
              className="cursor-pointer border-b border-outline-variant/20 transition-colors hover:bg-surface-container-low"
              onClick={() => router.push(getPatientHref(p.id))}
            >
              <td className="px-5 py-4 text-sm font-semibold text-primary">
                {p.patient_code ?? `PT-${String(p.id).slice(0, 6).toUpperCase()}`}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <AvatarCircle initials={getInitials(p.full_name)} />
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{p.full_name}</p>
                    <p className="text-xs text-on-surface-variant">{getDemographicLabel(p)}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">{p.phone || '—'}</td>
              <td className="px-5 py-4">
                <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-primary">
                  {p.primary_goal ? (GOAL_LABELS[p.primary_goal] ?? p.primary_goal) : '—'}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-on-surface-variant">{formatDate(p.last_visit_at)}</td>
              <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/patients/${p.id}/edit`}
                    title="Edit patient"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/patients/${p.id}`}
                    title="Open profile"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      }
      mobileCards={
        <>
          {patients.map((p) => (
            <MobileCard key={p.id}>
              <div className="flex items-start gap-3">
                <AvatarCircle initials={getInitials(p.full_name)} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate text-sm font-bold text-on-surface">{p.full_name}</p>
                      <p className="mt-0.5 text-xs font-medium text-on-surface-variant">
                        {p.patient_code ?? `PT-${String(p.id).slice(0, 6).toUpperCase()}`}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {p.primary_goal ? (GOAL_LABELS[p.primary_goal] ?? p.primary_goal) : 'No Goal'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-on-surface-variant">
                    <p>Phone: {p.phone || '—'}</p>
                    <p>Last visit: {formatDate(p.last_visit_at)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={getPatientHref(p.id)}
                      className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-surface-container-low text-xs font-semibold text-on-surface-variant"
                    >
                      {action ? ACTION_BANNER[action].label.replace('Select a patient to ', '') : 'View Profile'}
                    </Link>
                    <Link
                      href={`/patients/${p.id}/edit`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant"
                      aria-label="Edit patient"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </MobileCard>
          ))}
        </>
      }
    />
    </>
  )
}
