'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  UserPlus,
  CalendarDays,
  Clock,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { createClient } from '@/lib/supabase/client'
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from '@/lib/validations/appointment'
import { createAppointment, getAvailableSlots } from '@/actions/appointments'
import { PatientForm } from '@/components/patients/patient-form'
import { PatientLookup } from '@/components/shared/patient-lookup'
import type { RecentPatient } from '@/actions/dashboard'
import {
  getCurrentDateInTimeZone,
  getCurrentTimeInTimeZone,
} from '@/lib/utils/timezone'
import { ResponsiveDatePicker } from '@/components/ui/responsive-date-picker'

// ── Types ──────────────────────────────────────────────────────────────────

interface PatientResult {
  id: string
  full_name: string
  patient_code: string
  phone: string | null
}

// ── Component ──────────────────────────────────────────────────────────────

interface CreateAppointmentFormProps {
  recentPatients?: RecentPatient[]
}

export function CreateAppointmentForm({ recentPatients = [] }: CreateAppointmentFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')

  const [isPending, startTransition] = useTransition()

  // Patient search state
  const [searchQuery, setSearchQuery] = useState('')

  // Selected patient
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  // Patient creation dialog (renders in a portal, avoids nested form structure)
  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false)

  // Slot state
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotDuration, setSlotDuration] = useState(30)

  const clinicToday = useMemo(() => getCurrentDateInTimeZone(), [])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patient_id: preselectedPatientId ?? '',
      purpose: undefined,
      mode: undefined,
      appointment_date: clinicToday,
      appointment_time: '',
      notes: '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchMode = watch('mode')
  const watchPurpose = watch('purpose')
  const watchDate = watch('appointment_date')
  const watchTime = watch('appointment_time')

  // ── Pre-select patient from URL ──────────────────────────────────────
  useEffect(() => {
    if (!preselectedPatientId) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, patient_code, phone')
        .eq('id', preselectedPatientId)
        .single()
      if (data) {
        setSelectedPatient(data as PatientResult)
        setValue('patient_id', (data as PatientResult).id)
      }
    }
    fetchPatient()
  }, [preselectedPatientId, setValue])

  // ── Fetch available slots when date changes ──────────────────────────
  useEffect(() => {
    if (!watchDate || watchMode !== 'scheduled') {
      setAvailableSlots([])
      return
    }
    const fetchSlots = async () => {
      setSlotsLoading(true)
      const result = await getAvailableSlots(watchDate)
      setAvailableSlots(result.slots)
      setSlotDuration(result.slotDuration)
      setSlotsLoading(false)
      // Clear selected time if it's no longer available
      if (watchTime && !result.slots.includes(watchTime)) {
        setValue('appointment_time', '')
      }
    }
    fetchSlots()
  }, [watchDate, watchMode, setValue, watchTime])

  // ── Select patient handler ───────────────────────────────────────────
  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient)
    setValue('patient_id', patient.id)
    setSearchQuery('')
    setShowCreatePatientDialog(false)
  }

  // ── Inline patient created ───────────────────────────────────────────
  const handleInlinePatientCreated = async (patientId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, patient_code, phone')
      .eq('id', patientId)
      .single()
    if (data) {
      handleSelectPatient(data as PatientResult)
    }
    setShowCreatePatientDialog(false)
  }

  // ── Change patient ───────────────────────────────────────────────────
  const handleChangePatient = () => {
    setSelectedPatient(null)
    setValue('patient_id', '')
    setSearchQuery('')
  }

  // ── Format helpers ───────────────────────────────────────────────────
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
  }

  // ── Walk-in: auto-fill date/time ─────────────────────────────────────
  useEffect(() => {
    if (watchMode === 'walk_in') {
      setValue('appointment_date', getCurrentDateInTimeZone())
      setValue('appointment_time', getCurrentTimeInTimeZone())
    }
  }, [watchMode, setValue])

  // ── Submit ───────────────────────────────────────────────────────────
  const onSubmit = (data: CreateAppointmentInput) => {
    startTransition(async () => {
      const result = await createAppointment(data)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Appointment created successfully')
      router.push('/appointments')
    })
  }

  // ── Summary data ─────────────────────────────────────────────────────
  const PURPOSE_LABELS: Record<string, string> = {
    new_consultation: 'New Consultation',
    follow_up: 'Follow-up',
    review_with_report: 'Review with Report',
    custom: 'Custom',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 1: Patient Search                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <PatientLookup
              value={searchQuery}
              onValueChange={setSearchQuery}
              onSelect={handleSelectPatient}
              placeholder="Search by name, phone, or patient ID..."
              emptyMessage={searchQuery.trim() ? `No patients found for "${searchQuery}"` : 'No patients found'}
            />

            {/* Recent Patients */}
            {recentPatients.length > 0 && !searchQuery.trim() && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent Patients
                </p>
                <div className="divide-y divide-outline-variant/20 rounded-xl border border-outline-variant/30">
                  {recentPatients.map((rp) => (
                    <button
                      key={rp.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low first:rounded-t-xl last:rounded-b-xl"
                      onClick={() =>
                        handleSelectPatient({
                          id: rp.id,
                          full_name: rp.full_name,
                          patient_code: rp.patient_code,
                          phone: rp.phone || null,
                        })
                      }
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {rp.full_name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-on-surface">{rp.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {rp.patient_code}
                          {rp.phone ? ` · ${rp.phone}` : ''}
                        </p>
                      </div>
                      {rp.last_visit_at && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(rp.last_visit_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Patient button */}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                setShowCreatePatientDialog(true)
              }}
            >
              <UserPlus className="h-4 w-4" />
              + Add New Patient
            </Button>

            {errors.patient_id && (
              <p className="text-xs text-destructive">{errors.patient_id.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 3: Selected Patient Summary                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {selectedPatient.patient_code}
                </code>
                <span className="mx-1.5">·</span>
                {selectedPatient.phone}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleChangePatient}
              className="shrink-0"
            >
              Change Patient
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 4: Appointment Details                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purpose */}
              <div className="space-y-1.5">
                <Label>
                  Purpose <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="purpose"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_consultation">New Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="review_with_report">Review with Report</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.purpose && (
                  <p className="text-xs text-destructive">{errors.purpose.message}</p>
                )}
              </div>

              {/* Custom purpose (conditional) */}
              {watchPurpose === 'custom' && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom_purpose">
                    Custom Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="custom_purpose"
                    placeholder="Enter custom purpose"
                    {...register('custom_purpose')}
                  />
                  {errors.custom_purpose && (
                    <p className="text-xs text-destructive">{errors.custom_purpose.message}</p>
                  )}
                </div>
              )}

              {/* Mode */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Appointment Mode <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <div className="flex gap-3">
                      {([
                        { value: 'walk_in', label: 'Walk-in', desc: 'Patient is here now' },
                        { value: 'scheduled', label: 'Scheduled', desc: 'Book a future slot' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'flex-1 rounded-2xl border p-4 text-left transition-all hover:border-primary/60',
                            field.value === opt.value
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border'
                          )}
                        >
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                />
                {errors.mode && (
                  <p className="text-xs text-destructive">{errors.mode.message}</p>
                )}
              </div>

              {/* Date (for scheduled mode) */}
              {watchMode === 'scheduled' && (
                <div className="space-y-1.5">
                  <Label htmlFor="appointment_date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="appointment_date"
                    render={({ field }) => (
                      <ResponsiveDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        min={clinicToday}
                        sheetTitle="Select appointment date"
                      />
                    )}
                  />
                  {errors.appointment_date && (
                    <p className="text-xs text-destructive">{errors.appointment_date.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Time Slot Selection ──────────────────────────────── */}
            {watchMode === 'scheduled' && watchDate && (
              <div className="space-y-2">
                <Label>
                  Time Slot <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({slotDuration} min per slot)
                  </span>
                </Label>

                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available slots…
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <CalendarDays className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    <p>No available slots for this date.</p>
                    <p className="text-xs mt-1">
                      The dietitian may not have set availability for this day, or all slots are booked.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setValue('appointment_time', slot)}
                        className={cn(
                          'rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all min-h-10',
                          watchTime === slot
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/10'
                        )}
                      >
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {errors.appointment_time && (
                  <p className="text-xs text-destructive">{errors.appointment_time.message}</p>
                )}
              </div>
            )}

            {/* Walk-in confirmation */}
            {watchMode === 'walk_in' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                Walk-in appointment will be created for now ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}).
              </div>
            )}

            {/* Notes */}
            <CollapsibleSection
              title="Additional Notes"
              subtitle="Optional"
              defaultOpen={false}
              className="rounded-xl border border-outline-variant"
              contentClassName="px-4 pb-4"
            >
              <Textarea
                id="notes"
                placeholder="Any additional notes for this appointment..."
                rows={3}
                {...register('notes')}
              />
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Section 5: Appointment Summary                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && watchMode && watchPurpose && (
        <Card className="border-primary/30 bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Appointment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Patient</dt>
                <dd className="font-medium">{selectedPatient.full_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Purpose</dt>
                <dd className="font-medium">
                  {watchPurpose === 'custom'
                    ? watch('custom_purpose') || 'Custom'
                    : PURPOSE_LABELS[watchPurpose]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Mode</dt>
                <dd className="font-medium capitalize">
                  {watchMode === 'walk_in' ? 'Walk-in' : 'Scheduled'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Date</dt>
                <dd className="font-medium">
                  {watchDate
                    ? new Date(watchDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
              {watchTime && (
                <div>
                  <dt className="text-muted-foreground text-xs">Time</dt>
                  <dd className="font-medium">{formatTime(watchTime)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  Actions                                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedPatient && (
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-5 min-h-11"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Saving…' : 'Create Appointment'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      )}

      <Dialog open={showCreatePatientDialog} onOpenChange={setShowCreatePatientDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>
              Add a patient and continue booking the appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-5">
            <PatientForm
              mode="create"
              onSuccess={handleInlinePatientCreated}
              embedded
              onCancel={() => setShowCreatePatientDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
