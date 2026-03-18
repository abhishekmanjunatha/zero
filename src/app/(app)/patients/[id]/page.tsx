import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarPlus, FileText, FlaskConical, Pencil, User } from 'lucide-react'
import {
  getPatient,
  getPatientAppointments,
  getPatientClinicalNotes,
  getPatientLabReports,
  getPatientTimeline,
} from '@/actions/patients'
import { PatientProfileTabs } from '@/components/patients/patient-profile-tabs'
import { LinkButton } from '@/components/ui/link-button'

interface PatientProfilePageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: PatientProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const patient = await getPatient(id)
  return { title: patient ? patient.full_name : 'Patient Profile' }
}

export default async function PatientProfilePage({ params, searchParams }: PatientProfilePageProps) {
  const { id } = await params
  const resolvedSearchParams = (await searchParams) ?? {}

  const initialTab =
    typeof resolvedSearchParams.tab === 'string' &&
    ['summary', 'health', 'appointments', 'notes', 'labs', 'timeline'].includes(resolvedSearchParams.tab)
      ? (resolvedSearchParams.tab as 'summary' | 'health' | 'appointments' | 'notes' | 'labs' | 'timeline')
      : undefined

  const [patient, appointments, clinicalNotes, labReports, timeline] = await Promise.all([
    getPatient(id),
    getPatientAppointments(id),
    getPatientClinicalNotes(id),
    getPatientLabReports(id),
    getPatientTimeline(id),
  ])

  if (!patient) notFound()

  return (
    <div className="space-y-3 sm:space-y-4 max-w-5xl">
      {/* ── Profile Header ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <User className="h-5 w-5" />
          </div>

          {/* Name + ID */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-semibold truncate">{patient.full_name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{patient.patient_code}</code>
              <span className="mx-1.5">·</span>
              {patient.phone}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <LinkButton
              href={`/appointments/new?patient=${patient.id}`}
              variant="default"
              size="xs"
              className="h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add Appointment
            </LinkButton>
            <LinkButton
              href={`/clinical-notes/new?patient=${patient.id}`}
              variant="outline"
              size="xs"
              className="h-7 gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Clinical Document
            </LinkButton>
            <LinkButton
              href={`/patients/${patient.id}/lab-reports/upload`}
              variant="outline"
              size="xs"
              className="h-7 gap-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Upload Lab Report
            </LinkButton>
            <LinkButton
              href={`/patients/${patient.id}/edit`}
              variant="ghost"
              size="xs"
              className="h-7 gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </LinkButton>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <PatientProfileTabs
        patient={patient}
        appointments={appointments}
        clinicalNotes={clinicalNotes}
        labReports={labReports}
        timeline={timeline}
        initialTab={initialTab}
      />
    </div>
  )
}
