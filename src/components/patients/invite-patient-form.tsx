'use client'

import { useRef, useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveDatePicker } from '@/components/ui/responsive-date-picker'
import { ResponsiveSelect } from '@/components/ui/responsive-select'
import { StepProgress, type StepConfig } from '@/components/shared/step-wizard'
import { cn } from '@/lib/utils'
import { createPatientSchema, type CreatePatientInput } from '@/lib/validations/patient'

const MEDICAL_CONDITIONS = [
  'Diabetes', 'Hypertension', 'PCOS', 'Thyroid Disorder',
  'Heart Disease', 'Kidney Disease', 'Liver Disease', 'Other',
]

const FOOD_ALLERGIES = ['Nuts', 'Dairy', 'Gluten', 'Soy', 'Eggs', 'Shellfish', 'Other']

const STEPS: StepConfig[] = [
  { label: 'Basic Info' },
  { label: 'Lifestyle' },
  { label: 'Medical' },
]

const STEP_FIELDS: Record<number, (keyof CreatePatientInput)[]> = {
  0: ['full_name', 'phone', 'gender', 'date_of_birth', 'height_cm', 'weight_kg'],
  1: ['activity_level', 'sleep_hours', 'work_type', 'dietary_type', 'primary_goal'],
  2: ['medical_conditions', 'food_allergies'],
}

interface InvitePatientFormProps {
  token: string
  dietitianName: string
  phone: string
  countryCode: string
}

export function InvitePatientForm({ token, dietitianName, phone, countryCode }: InvitePatientFormProps) {
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)
  const [showOptional, setShowOptional] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([])
  const [otherConditionText, setOtherConditionText] = useState('')
  const [otherAllergyText, setOtherAllergyText] = useState('')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768)
    }
  })

  const {
    register,
    handleSubmit,
    control,
    setError,
    trigger,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      full_name: '',
      phone: `${countryCode}${phone}`,
      gender: undefined,
      date_of_birth: '',
      height_cm: undefined,
      weight_kg: undefined,
      activity_level: undefined,
      sleep_hours: undefined,
      work_type: undefined,
      dietary_type: undefined,
      primary_goal: undefined,
      medical_conditions: [],
      food_allergies: [],
    },
  })

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

      try {
        const res = await fetch('/api/invite/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, ...payload }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const message =
            res.status === 410 ? 'This invite link has expired.' :
            res.status === 409 ? 'This invite has already been used.' :
            body.error || 'Something went wrong. Please try again.'
          setError('root', { message })
          toast.error(message)
          return
        }

        setIsComplete(true)
        toast.success('Profile created successfully!')
      } catch {
        setError('root', { message: 'Network error. Please check your connection.' })
        toast.error('Network error.')
      }
    })
  }

  const handleNext = async () => {
    if (step === STEPS.length - 1) {
      handleSubmit(onSubmit)()
      return
    }
    const fields = STEP_FIELDS[step]
    const isValid = fields ? await trigger(fields) : true
    if (isValid) setStep((s) => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  // ── Success screen ──
  if (isComplete) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-on-surface">You&apos;re all set!</h1>
        <p className="text-sm text-muted-foreground">
          Your profile has been shared with <span className="font-semibold text-on-surface">{dietitianName}</span>.
          They will reach out to you for your next steps.
        </p>
      </div>
    )
  }

  // ── Shared field blocks ──

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
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary-container ring-2 ring-transparent hover:ring-primary/30 transition-all"
        aria-label="Select your photo"
      >
        {photoPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoPreviewUrl} alt="Preview" className="h-full w-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-secondary" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        )}
      </button>
      <p className="text-sm font-medium text-on-surface-variant">
        {photoPreviewUrl ? 'Tap to change photo' : 'Upload Your Photo (Optional)'}
      </p>
    </div>
  )

  const basicInfoFields = (
    <div className="rounded-xl bg-card p-6 shadow space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-1 rounded-full bg-primary" />
        <h2 className="font-heading text-lg font-bold text-on-surface">Basic Information</h2>
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-semibold text-on-surface-variant">
          Phone Number <span className="text-destructive/70">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          readOnly
          className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface read-only:opacity-70"
          {...register('phone')}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

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

      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Date of Birth</Label>
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
        <Controller control={control} name="activity_level"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select activity level" sheetTitle="Select activity level"
              options={[{ value: 'sedentary', label: 'Sedentary' }, { value: 'lightly_active', label: 'Lightly Active' }, { value: 'highly_active', label: 'Highly Active' }]} />
          )} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sleep_hours" className="text-sm font-semibold text-on-surface-variant">Sleep Hours / Night</Label>
        <Input id="sleep_hours" type="number" step="0.5" min="0" max="24" placeholder="8"
          className="h-12 rounded-lg border-none bg-surface-container-high px-4 text-sm text-on-surface placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40"
          {...register('sleep_hours', { valueAsNumber: true })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Work Type</Label>
        <Controller control={control} name="work_type"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select work type" sheetTitle="Select work type"
              options={[{ value: 'desk_job', label: 'Desk Job' }, { value: 'field_work', label: 'Field Work' }, { value: 'other', label: 'Other' }]} />
          )} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Dietary Type</Label>
        <Controller control={control} name="dietary_type"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select dietary type" sheetTitle="Select dietary type"
              options={[{ value: 'vegetarian', label: 'Vegetarian' }, { value: 'non_vegetarian', label: 'Non-Vegetarian' }, { value: 'vegan', label: 'Vegan' }, { value: 'eggitarian', label: 'Eggitarian' }]} />
          )} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold text-on-surface-variant">Primary Goal</Label>
        <Controller control={control} name="primary_goal"
          render={({ field }) => (
            <ResponsiveSelect value={field.value ?? ''} onValueChange={field.onChange} placeholder="Select primary goal" sheetTitle="Select primary goal"
              options={[{ value: 'weight_loss', label: 'Weight Loss' }, { value: 'muscle_gain', label: 'Muscle Gain' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'condition_management', label: 'Condition Management' }]} />
          )} />
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
            </button>
          ))}
        </div>
        {selectedConditions.includes('Other') && (
          <Input type="text" placeholder="Describe the condition…" value={otherConditionText} onChange={(e) => setOtherConditionText(e.target.value)}
            className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm" />
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
            </button>
          ))}
        </div>
        {selectedAllergies.includes('Other') && (
          <Input type="text" placeholder="Specify the allergy…" value={otherAllergyText} onChange={(e) => setOtherAllergyText(e.target.value)}
            className="h-11 rounded-lg border-none bg-surface-container-high px-4 text-sm" />
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header / branding */}
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold text-on-surface sm:text-2xl">Join Patient Directory</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ve been invited by <span className="font-semibold text-primary">{dietitianName}</span>
        </p>
      </div>

      {errors.root && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      {/* Mobile: step wizard */}
      {isMobile ? (
        <div className="space-y-5 pb-32">
          <StepProgress steps={STEPS} currentStep={step} />

          {step === 0 && (
            <div className="space-y-5">
              {photoUpload}
              {basicInfoFields}
            </div>
          )}

          {step === 1 && (
            <div className="rounded-xl bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="font-heading text-lg font-bold text-on-surface">Lifestyle &amp; Goals</h2>
              </div>
              {lifestyleFields}
            </div>
          )}

          {step === 2 && medicalFields}

          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/30 bg-card px-5 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleBack} disabled={isPending || step === 0}
                className="flex-1 h-12 rounded-xl border-primary/30 text-primary font-semibold gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={handleNext} disabled={isPending}
                className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
                {step === STEPS.length - 1 ? (
                  <>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Submitting…' : 'Submit'}
                  </>
                ) : (
                  <>Next <ChevronRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: collapsible layout */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {photoUpload}
          {basicInfoFields}

          <div className="rounded-xl bg-card shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptional((v) => !v)}
              className="flex w-full items-center justify-between px-6 py-5 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="font-heading text-lg font-bold text-on-surface">
                  Lifestyle, Goals &amp; Medical Details
                </h2>
              </div>
              {showOptional ? <ChevronUp className="h-5 w-5 text-on-surface-variant" /> : <ChevronDown className="h-5 w-5 text-on-surface-variant" />}
            </button>

            {showOptional && (
              <div className="space-y-5 border-t border-outline-variant/20 px-6 py-6">
                {lifestyleFields}
                <div className="my-5 h-px bg-outline-variant/20" />
                {medicalFields}
              </div>
            )}
          </div>

          <Button type="submit" disabled={isPending}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? 'Submitting…' : 'Submit My Details'}
          </Button>
        </form>
      )}
    </div>
  )
}
