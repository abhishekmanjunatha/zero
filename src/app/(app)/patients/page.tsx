import type { Metadata } from 'next'
import { getPatients } from '@/actions/patients'
import { getPatientInvites, type InviteStatusFilter } from '@/actions/invites'
import { PatientsList } from '@/components/patients/patients-list'
import { PatientsPageToolbar } from '@/components/patients/patients-page-toolbar'
import { InvitesList } from '@/components/patients/invites-list'
import { InvitesToolbar } from '@/components/patients/invites-toolbar'

export const metadata: Metadata = { title: 'Patients' }

type PatientsFilterMode = 'all' | 'appointments' | 'labs' | 'notes'
type PatientAction = 'upload-lab' | 'write-note' | 'create-appointment' | undefined
type PageView = 'directory' | 'invites'

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; mode?: string; from?: string; to?: string; action?: string; view?: string; status?: string }>
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { q, mode: rawMode, from: rawFrom, to: rawTo, action: rawAction, view: rawView, status: rawStatus } = await searchParams

  const view: PageView = rawView === 'invites' ? 'invites' : 'directory'

  // ── Invites view ──
  if (view === 'invites') {
    const status: InviteStatusFilter =
      rawStatus === 'pending' || rawStatus === 'completed' || rawStatus === 'expired'
        ? rawStatus
        : 'all'

    const { data: invites, error: fetchError } = await getPatientInvites({
      search: q,
      status,
    })

    return (
      <div className="space-y-6 lg:space-y-8">
        <PatientsPageToolbar
          key={`invites:${q ?? ''}:${status}`}
          initialQuery={q ?? ''}
          initialMode="all"
          initialDateFrom=""
          initialDateTo=""
          patientsForExport={[]}
          view="invites"
        />
        <InvitesToolbar initialQuery={q ?? ''} initialStatus={status} />
        <InvitesList invites={invites} searchQuery={q ?? ''} fetchError={fetchError} />
      </div>
    )
  }

  // ── Directory view (default) ──
  const mode: PatientsFilterMode =
    rawMode === 'appointments' || rawMode === 'labs' || rawMode === 'notes'
      ? rawMode
      : 'all'

  const action: PatientAction =
    rawAction === 'upload-lab' || rawAction === 'write-note' || rawAction === 'create-appointment'
      ? rawAction
      : undefined

  const dateFrom: string = /^\d{4}-\d{2}-\d{2}$/.test(rawFrom ?? '') ? (rawFrom ?? '') : ''
  const dateTo: string = /^\d{4}-\d{2}-\d{2}$/.test(rawTo ?? '') ? (rawTo ?? '') : ''

  const { data: patients, error: fetchError } = await getPatients({
    search: q,
    mode,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <PatientsPageToolbar
        key={`dir:${q ?? ''}:${mode}:${dateFrom}:${dateTo}:${action ?? ''}`}
        initialQuery={q ?? ''}
        initialMode={mode}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        patientsForExport={patients}
        action={action}
        view="directory"
      />
      <PatientsList patients={patients} searchQuery={q ?? ''} fetchError={fetchError} action={action} />
    </div>
  )
}
