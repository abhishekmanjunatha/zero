import type { Metadata } from 'next'
import { getPatients } from '@/actions/patients'
import { PatientsList } from '@/components/patients/patients-list'
import { PatientsPageToolbar } from '@/components/patients/patients-page-toolbar'

export const metadata: Metadata = { title: 'Patients' }

type PatientsFilterMode = 'all' | 'appointments' | 'labs' | 'notes'

interface PatientsPageProps {
  searchParams: Promise<{ q?: string; mode?: string; from?: string; to?: string }>
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { q, mode: rawMode, from: rawFrom, to: rawTo } = await searchParams
  const mode: PatientsFilterMode =
    rawMode === 'appointments' || rawMode === 'labs' || rawMode === 'notes'
      ? rawMode
      : 'all'

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
        key={`${q ?? ''}:${mode}:${dateFrom}:${dateTo}`}
        initialQuery={q ?? ''}
        initialMode={mode}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        patientsForExport={patients}
      />
      <PatientsList patients={patients} searchQuery={q ?? ''} fetchError={fetchError} />
    </div>
  )
}
