import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus, Clock3, FileText, FlaskConical, Pencil } from 'lucide-react'
import {
  getPatient,
  getPatientAppointments,
  getPatientClinicalNotes,
  getPatientLabReports,
  getPatientTimeline,
} from '@/actions/patients'
import { PatientProfileTabs } from '@/components/patients/patient-profile-tabs'
import { cn } from '@/lib/utils'

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return `${first}${second}`.toUpperCase() || 'PT'
}

function formatDateTime(date: string, time: string) {
  const datetime = new Date(`${date}T${time}`)
  return datetime.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

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

  const now = new Date()
  const nextScheduledVisit = appointments
    .map((appt) => ({
      ...appt,
      when: new Date(`${appt.appointment_date}T${appt.appointment_time}`),
    }))
    .filter(
      (appt) =>
        appt.when >= now &&
        appt.status !== 'completed' &&
        appt.status !== 'cancelled' &&
        appt.status !== 'no_show'
    )
    .sort((a, b) => a.when.getTime() - b.when.getTime())[0]

  const actionButtonClass =
    'inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low active:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'

  return (
    <div className="app-page space-y-4 lg:space-y-6">
      <div className="relative">
        <div className="rounded-3xl border border-outline-variant bg-white/95 p-4 shadow-[0_10px_30px_-18px_rgba(7,39,64,0.55)] lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-outline-variant bg-gradient-to-br from-surface-container-low to-surface-container-high text-lg font-black text-primary sm:h-20 sm:w-20">
                  {getInitials(patient.full_name)}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-tertiary-container" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-xl font-black tracking-tight text-primary sm:text-2xl">
                      {patient.full_name}
                    </h1>
                    <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                      Active Patient
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-outline/60 sm:text-xs">
                    Patient ID: <span className="font-semibold text-on-surface">{patient.patient_code}</span>
                    <span className="mx-1.5">·</span>
                    Phone: {patient.phone}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-3 lg:hidden">
                <Link
                  href={`/appointments/new?patient=${patient.id}`}
                  className="flex h-11 items-center justify-center rounded-xl bg-tertiary text-white transition-colors hover:bg-tertiary/90 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Add appointment"
                  title="Add appointment"
                >
                  <CalendarPlus className="h-4 w-4" />
                </Link>
                <Link
                  href={`/clinical-notes/new?patient=${patient.id}`}
                  className="flex h-11 items-center justify-center rounded-xl bg-secondary-container/40 text-primary transition-colors hover:bg-secondary-container/60 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Create clinical document"
                  title="Create clinical document"
                >
                  <FileText className="h-4 w-4" />
                </Link>
                <Link
                  href={`/patients/${patient.id}/lab-reports/upload`}
                  className="flex h-11 items-center justify-center rounded-xl bg-secondary-container/40 text-primary transition-colors hover:bg-secondary-container/60 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Upload lab report"
                  title="Upload lab report"
                >
                  <FlaskConical className="h-4 w-4" />
                </Link>
                <Link
                  href={`/patients/${patient.id}/edit`}
                  className="flex h-11 items-center justify-center rounded-xl bg-secondary-container/40 text-primary transition-colors hover:bg-secondary-container/60 active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Edit patient"
                  title="Edit patient"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="hidden min-w-[210px] self-start rounded-2xl bg-surface-container-low px-4 py-3 text-right lg:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-outline/70">Next Scheduled Visit</p>
              {nextScheduledVisit ? (
                <>
                  <p className="mt-2 text-sm font-bold text-primary">
                    {formatDateTime(nextScheduledVisit.appointment_date, nextScheduledVisit.appointment_time)}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant">
                    <Clock3 className="h-3.5 w-3.5" />
                    {nextScheduledVisit.mode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs font-medium text-on-surface-variant">No upcoming visit</p>
              )}
            </div>
          </div>
        </div>

        <Link
          href={`/patients/${patient.id}/edit`}
          className="absolute -bottom-4 right-3 hidden h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white text-primary shadow-md transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:flex"
          aria-label="Edit patient"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <Link
          href={`/appointments/new?patient=${patient.id}`}
          className={cn(
            actionButtonClass,
            'border-primary bg-primary font-bold text-white hover:bg-primary/90'
          )}
        >
          <CalendarPlus className="h-4 w-4" />
          Add Appointment
        </Link>
        <Link href={`/clinical-notes/new?patient=${patient.id}`} className={actionButtonClass}>
          <FileText className="h-4 w-4" />
          Clinical Document
        </Link>
        <Link href={`/patients/${patient.id}/lab-reports/upload`} className={actionButtonClass}>
          <FlaskConical className="h-4 w-4" />
          Upload Lab Report
        </Link>
      </div>

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
