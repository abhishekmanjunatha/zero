'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveDatePicker } from '@/components/ui/responsive-date-picker'
import { ResponsiveSelect } from '@/components/ui/responsive-select'
import { ContactPickerButton } from '@/components/shared/contact-picker-button'
import { StepProgress, type StepConfig } from '@/components/shared/step-wizard'
import { cn } from '@/lib/utils'
import { createPatientSchema, type CreatePatientInput } from '@/lib/validations/patient'
import { createPatient, updatePatient } from '@/actions/patients'
import { useLocalDraft } from '@/hooks/use-local-draft'
import { useIsMobile } from '@/hooks/use-is-mobile'
import type { Tables } from '@/types/database'

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Hypertension', 'PCOS', 'Thyroid Disorder',
  'Heart Disease', 'Kidney Disease', 'Liver Disease', 'Other',
]

const FOOD_ALLERGIES = ['Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Other']

const PATIENT_STEPS: StepConfig[] = [
  { label: 'Basic Info' },
  { label: 'Lifestyle' },
  { label: 'Medical' },
]

const STEP_FIELDS: Record<number, (keyof CreatePatientInput)[]> = {
  0: ['full_name', 'phone', 'gender', 'date_of_birth', 'height_cm', 'weight_kg'],
  1: ['activity_level', 'sleep_hours', 'work_type', 'dietary_type', 'primary_goal'],
  2: ['medical_conditions', 'food_allergies'],
}

interface PatientFormProps {
  mode: 'create' | 'edit'
  patient?: Tables<'patients'>
  onSuccess?: (patientId: string) => void
  embedded?: boolean
  onCancel?: () => void
}

interface PatientFormDraft {
  values: CreatePatientInput
  selectedConditions: string[]
  selectedAllergies: string[]
  showOptional: boolean
  mobileStep: number
}

export function PatientForm({ mode, patient, onSuccess, embedded = false, onCancel }: PatientFormProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isPending, startTransition] = useTransition()
  const [mobileStep, setMobileStep] = useState(0)
  const didHydrateDraftRef = useRef(false)
  const defaultValues: CreatePatientInput = {
    full_name: patient?.full_name ?? '',
    phone: patient?.phone ?? '',
    gender: patient?.gender ?? undefined,
    date_of_birth: patient?.date_of_birth ?? '',
    height_cm: patient?.height_cm ?? undefined,
    weight_kg: patient?.weight_kg ?? undefined,
    activity_level: patient?.activity_level ?? undefined,
    sleep_hours: patient?.sleep_hours ?? undefined,
    work_type: patient?.work_type ?? undefined,
    dietary_type: patient?.dietary_type ?? undefined,
    primary_goal: patient?.primary_goal ?? undefined,
    medical_conditions: patient?.medical_conditions ?? [],
    food_allergies: patient?.food_allergies ?? [],
  }
  const draftKey = mode === 'edit' && patient
    ? `patient-form-draft:edit:${patient.id}`
    : 'patient-form-draft:create'
  const { loadDraft, saveDraft, clearDraft } = useLocalDraft<PatientFormDraft>({
    storageKey: draftKey,
    debounceMs: 500,
  })
  const [showOptional, setShowOptional] = useState(
    mode === 'edit' &&
      !!(
        patient?.activity_level ||
        patient?.work_type ||
        patient?.dietary_type ||
        patient?.primary_goal ||
        (patient?.medical_conditions?.length ?? 0) > 0 ||
        (patient?.food_allergies?.length ?? 0) > 0
      )
  )
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    patient?.medical_conditions ?? []
  )
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    patient?.food_allergies ?? []
  )
  const [otherConditionText, setOtherConditionText] = useState('')
  const [otherAllergyText, setOtherAllergyText] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues,
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedValues = watch()

  useEffect(() => {
    if (didHydrateDraftRef.current) return

    const draft = loadDraft()
    if (!draft) {
      didHydrateDraftRef.current = true
      return
    }

    ;(Object.keys(draft.values) as (keyof CreatePatientInput)[]).forEach((key) => {
      const value = draft.values[key]
      if (value === undefined) return

      setValue(key, value)
    })

    setSelectedConditions(draft.selectedConditions)
    setSelectedAllergies(draft.selectedAllergies)
    setShowOptional(draft.showOptional)
    if (draft.mobileStep !== undefined) setMobileStep(draft.mobileStep)
    didHydrateDraftRef.current = true
  }, [loadDraft, setValue])

  useEffect(() => {
    if (!didHydrateDraftRef.current) return

    saveDraft({
      values: watchedValues,
      selectedConditions,
      selectedAllergies,
      showOptional,
      mobileStep,
    })
  }, [saveDraft, selectedAllergies, selectedConditions, showOptional, watchedValues, mobileStep])

  const toggleCondition = (v: string) =>
    setSelectedConditions((prev) =>
      prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]
    )

  const toggleAllergy = (v: string) =>
    setSelectedAllergies((prev) =>
      prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]
    )

  const onSubmit = (data: CreatePatientInput) => {
    startTransition(async () => {
      const payload: CreatePatientInput = {
        ...data,
        medical_conditions: selectedConditions.map((c) =>
          c === 'Other' && otherConditionText.trim() ? otherConditionText.trim() : c
        ),
        food_allergies: selectedAllergies.map((a) =>
          a === 'Other' && otherAllergyText.trim() ? otherAllergyText.trim() : a
        ),
      }

      if (mode === 'create') {
        const result = await createPatient(payload)
        if (result.error) {
          setError('root', { message: result.error })
          return
        }
        toast.success('Patient created successfully')
        clearDraft()
        if (onSuccess && result.patientId) {
          onSuccess(result.patientId)
        } else {
          router.push(`/patients/${result.patientId}`)
        }
      } else if (patient) {
        const result = await updatePatient(patient.id, payload)
        if (result.error) {
          setError('root', { message: result.error })
          return
        }
        toast.success('Patient updated successfully')
        clearDraft()
        if (onSuccess) {
          onSuccess(patient.id)
        } else {
          router.push(`/patients/${patient.id}`)
        }
      }
    })
  }

  // ── Mobile step navigation ──
  const handleMobileNext = async () => {
    if (mobileStep === PATIENT_STEPS.length - 1) {
      handleSubmit(onSubmit)()
      return
    }
    const fields = STEP_FIELDS[mobileStep]
    const isValid = fields ? await trigger(fields) : true
    if (isValid) setMobileStep((s) => s + 1)
  }

  const handleMobileBack = () => {
    if (mobileStep === 0) {
      if (embedded) { onCancel?.(); return }
      router.back()
      return
    }
    setMobileStep((s) => s - 1)
  }

  // ── Shared field JSX ──

  const photoUpload = (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-outline-variant bg-card px-6 py-6 transition-colors hover:border-primary/40 hover:bg-surface-container-low">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setPhotoPreviewUrl(URL.createObjectURL(file))
        }}
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary-container ring-2 ring-transparent hover:ring-primary/30 transition-all"
          aria-label="Select patient photo"
        >
          {photoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreviewUrl} alt="Patient preview" className="h-full w-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md hover:bg-primary-container transition-colors"
          aria-label="Upload photo"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>add_a_photo</span>
        </button>
      </div>
      <p className="text-sm font-medium text-on-surface-variant">
        {photoPreviewUrl ? 'Tap to change photo' : 'Upload Patient Photo (Optional)'}
      </p>
    </div>
  )

  const basicInfoFields = (
    <div className="rounded-xl bg-card p-6 shadow space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="font-heading text-lg font-bold text-on-surface">Basic Information</h2>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <Label htmlFor="full_name" className="text-sm font-semibold text-on-surface-variant">
          Full Name <span className="text-destructive/70">*</span>
        </Label>
        <Input
          id="full_name"
          placeholder="e.g. John Doe"
          className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40"
          {...register('full_name')}
        />
        {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="phone" className="text-sm font-semibold text-on-surface-variant">
            Phone Number <span className="text-destructive/70">*</span>
          </Label>
          <ContactPickerButton
            className="h-8 px-2"
            ariaLabel="Pick patient contact"
            onContactPicked={({ displayName, phone }) => {
              setValue('phone', phone, { shouldDirty: true, shouldValidate: true })
              if (!watchedValues.full_name?.trim()) {
                setValue('full_name', displayName, { shouldDirty: true, shouldValidate: true })
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex h-12 items-center overflow-hidden rounded-lg bg-surface-container-high focus-within:ring-2 focus-within:ring-primary/40">
            <select className="h-full w-20 shrink-0 border-r border-outline-variant/40 bg-transparent pl-3 pr-1 text-sm text-on-surface focus:outline-none">
              <option>+91</option>
              <option>+1</option>
              <option>+44</option>
            </select>
            <input
              id="phone"
              type="tel"
              placeholder="Mobile number"
              className="h-full flex-1 bg-transparent px-4 text-sm text-on-surface placeholder:text-outline focus:outline-none"
              {...register('phone')}
            />
          </div>
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Gender</Label>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <ResponsiveSelect
              value={field.value ?? ''}
              onValueChange={field.onChange}
              placeholder="Select gender"
              sheetTitle="Select gender"
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
          )}
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">
          Date of Birth <span className="text-destructive/70">*</span>
        </Label>
        <Controller
          control={control}
          name="date_of_birth"
          render={({ field }) => (
            <ResponsiveDatePicker
              value={field.value}
              onChange={field.onChange}
              max={new Date().toISOString().slice(0, 10)}
              placeholder="Select date of birth"
              sheetTitle="Select date of birth"
            />
          )}
        />
      </div>

      {/* Height + Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="height_cm" className="text-sm font-semibold text-on-surface-variant">Height (cm)</Label>
          <Input
            id="height_cm"
            type="number"
            placeholder="175"
            className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40"
            {...register('height_cm', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weight_kg" className="text-sm font-semibold text-on-surface-variant">Weight (kg)</Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.1"
            placeholder="70"
            className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40"
            {...register('weight_kg', { valueAsNumber: true })}
          />
        </div>
      </div>
    </div>
  )

  const lifestyleFields = (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Activity Level</Label>
        <Controller
          control={control}
          name="activity_level"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select activity level" sheetTitle="Select activity level"
              options={[{ value: 'sedentary', label: 'Sedentary' }, { value: 'lightly_active', label: 'Lightly Active' }, { value: 'highly_active', label: 'Highly Active' }]} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sleep_hours" className="text-sm font-semibold text-on-surface-variant">Sleep Hours / Night</Label>
        <Input id="sleep_hours" type="number" step="0.5" min="0" max="24" placeholder="8"
          className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40"
          {...register('sleep_hours', { valueAsNumber: true })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Work Type</Label>
        <Controller
          control={control}
          name="work_type"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select work type" sheetTitle="Select work type"
              options={[{ value: 'desk_job', label: 'Desk Job' }, { value: 'field_work', label: 'Field Work' }, { value: 'other', label: 'Other' }]} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Dietary Type</Label>
        <Controller
          control={control}
          name="dietary_type"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select dietary type" sheetTitle="Select dietary type"
              options={[{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'eggitarian', label: 'Eggitarian' }]} />
          )}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Primary Goal</Label>
        <Controller
          control={control}
          name="primary_goal"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select primary goal" sheetTitle="Select primary goal"
              options={[{ value: 'weight_loss', label: 'Weight Loss' }, { value: 'muscle_gain', label: 'Muscle Gain' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'condition_management', label: 'Condition Management' }]} />
          )}
        />
      </div>
    </div>
  )

  const medicalFields = (
    <div className="space-y-5">
      <div className="rounded-xl bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1 rounded-full bg-primary" />
          <h2 className="font-heading text-lg font-bold text-on-surface">Medical Conditions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {MEDICAL_CONDITIONS.map((cond) => (
            <button key={cond} type="button" onClick={() => toggleCondition(cond)}
              className={cn('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all',
                selectedConditions.includes(cond) ? 'bg-primary text-primary-foreground shadow-md' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
              )}>
              {cond}
              {selectedConditions.includes(cond) && (
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>check</span>
              )}
            </button>
          ))}
        </div>
        {selectedConditions.includes('Other') && (
          <div className="mt-2">
            <Input type="text" placeholder="Describe the condition…" value={otherConditionText} onChange={(e) => setOtherConditionText(e.target.value)}
              className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40" />
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1 rounded-full bg-primary" />
          <h2 className="font-heading text-lg font-bold text-on-surface">Food Allergies</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {FOOD_ALLERGIES.map((allergy) => (
            <button key={allergy} type="button" onClick={() => toggleAllergy(allergy)}
              className={cn('flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all',
                selectedAllergies.includes(allergy) ? 'bg-primary text-primary-foreground shadow-md' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
              )}>
              {allergy}
              {selectedAllergies.includes(allergy) && (
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>check</span>
              )}
            </button>
          ))}
        </div>
        {selectedAllergies.includes('Other') && (
          <div className="mt-2">
            <Input type="text" placeholder="Specify the allergy…" value={otherAllergyText} onChange={(e) => setOtherAllergyText(e.target.value)}
              className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-primary/10 bg-primary/5 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container">
          <span className="material-symbols-outlined text-white" style={{ fontSize: 22, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>clinical_notes</span>
        </div>
        <div>
          <h4 className="font-heading font-bold text-primary">Pre-Consultation Check</h4>
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
            Ensure all required clinical markers (*) are captured before saving to maintain data integrity for the Strive AI Engine.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Mobile: Step Wizard Layout ── */}
      {isMobile ? (
        <div className="space-y-5 pb-32">
          <StepProgress steps={PATIENT_STEPS} currentStep={mobileStep} />

          {errors.root && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          {mobileStep === 0 && (
            <div className="space-y-5">
              {photoUpload}
              {basicInfoFields}
            </div>
          )}

          {mobileStep === 1 && (
            <div className="rounded-xl bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="font-heading text-lg font-bold text-on-surface">Lifestyle &amp; Goals</h2>
              </div>
              {lifestyleFields}
            </div>
          )}

          {mobileStep === 2 && medicalFields}

          {/* Mobile step navigation footer */}
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/30 bg-card px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleMobileBack} disabled={isPending}
                className="flex-1 h-12 rounded-xl border-primary/30 text-primary font-semibold gap-2">
                <ChevronLeft className="h-4 w-4" />
                {mobileStep === 0 ? 'Cancel' : 'Back'}
              </Button>
              <Button type="button" onClick={handleMobileNext} disabled={isPending}
                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
                {mobileStep === PATIENT_STEPS.length - 1 ? (
                  <>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Saving…' : mode === 'create' ? 'Create Patient' : 'Save Changes'}
                  </>
                ) : (
                  <>Next <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Desktop: Full Form Layout ── */
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 lg:max-w-3xl">
            {errors.root && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            {photoUpload}
            {basicInfoFields}

            {/* Health Details (collapsible on desktop) */}
            <div className="rounded-xl bg-card shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                className="flex w-full items-center justify-between px-6 py-5 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-1 rounded-full bg-primary" />
                  <h2 className="font-heading text-lg font-bold text-on-surface">
                    Health Details <span className="text-sm font-normal text-on-surface-variant">(Optional)</span>
                  </h2>
                </div>
                {showOptional ? (
                  <ChevronUp className="h-5 w-5 text-on-surface-variant" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-on-surface-variant" />
                )}
              </button>

              {showOptional && (
                <div className="px-6 pb-6 border-t border-surface-container">
                  <div className="pt-5">{lifestyleFields}</div>
                </div>
              )}
            </div>

            {medicalFields}

            {/* Desktop Actions */}
            <div className="flex items-center gap-3 pb-4">
              <Button type="submit" disabled={isPending}
                className="h-11 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground hover:bg-primary/90 gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending ? 'Saving…' : mode === 'create' ? 'Create Patient' : 'Save Changes'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { if (embedded) { onCancel?.(); return }; router.back() }}
                disabled={isPending} className="h-11 rounded-xl px-6 text-sm font-bold text-on-surface-variant">
                Cancel
              </Button>
            </div>
          </form>
        </>
      )}
    </>
  )
}
