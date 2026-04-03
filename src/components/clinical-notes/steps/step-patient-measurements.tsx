'use client'

import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, formatLabel } from '@/lib/utils'
import { GOAL_LABELS, ACTIVITY_LABELS, GENDER_LABELS, DIETARY_LABELS } from '@/lib/constants/labels'
import { computeAge, computeBMI, computeIBW, type PatientContext } from '../composer-helpers'

interface StepPatientMeasurementsProps {
  patient: PatientContext | null
  visitHeight: string
  visitWeight: string
  originalWeight: number | null | undefined
  isSavingMeasurements: boolean
  onVisitHeightChange: (v: string) => void
  onVisitWeightChange: (v: string) => void
  onSaveMeasurements: () => void
}

export function StepPatientMeasurements({
  patient, visitHeight, visitWeight, originalWeight,
  isSavingMeasurements, onVisitHeightChange, onVisitWeightChange, onSaveMeasurements,
}: StepPatientMeasurementsProps) {
  return (
    <div className="space-y-4">
      {/* Patient info card */}
      {patient ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20">
            <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Patient</h2>
          </div>
          <div className="px-6 pb-6 pt-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base select-none">
                {patient.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{patient.full_name}</p>
                <p className="text-xs text-on-surface-variant">{patient.patient_code}  {patient.phone}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Age', value: computeAge(patient.date_of_birth) },
                { label: 'Gender', value: patient.gender ? (GENDER_LABELS[patient.gender as keyof typeof GENDER_LABELS] ?? formatLabel(patient.gender)) : 'N/A' },
                { label: 'Height', value: patient.height_cm ? `${patient.height_cm} cm` : 'N/A' },
                { label: 'Weight', value: patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A' },
                { label: 'Goal', value: patient.primary_goal ? (GOAL_LABELS[patient.primary_goal as keyof typeof GOAL_LABELS] ?? formatLabel(patient.primary_goal)) : 'N/A' },
                { label: 'Activity', value: patient.activity_level ? (ACTIVITY_LABELS[patient.activity_level as keyof typeof ACTIVITY_LABELS] ?? formatLabel(patient.activity_level)) : 'N/A' },
                { label: 'Diet', value: patient.dietary_type ? (DIETARY_LABELS[patient.dietary_type as keyof typeof DIETARY_LABELS] ?? formatLabel(patient.dietary_type)) : 'N/A' },
                { label: 'Conditions', value: patient.medical_conditions?.join(', ') || 'None' },
                { label: 'Allergies', value: patient.food_allergies?.join(', ') || 'None' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-xs font-semibold text-on-surface mt-0.5 capitalize leading-tight">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant">Loading patient details...</p>
        </div>
      )}

      {/* Visit Measurements card */}
      {patient && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20">
            <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Visit Measurements</h2>
          </div>
          <div className="px-6 pb-6 pt-4 space-y-4">
            <p className="text-xs text-on-surface-variant">
              Record today&apos;s measurements. Tap <strong>Save</strong> to update the patient profile and log the weight change.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visit-height" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Height (cm)</Label>
                <Input id="visit-height" type="number" min={50} max={270} step={0.1}
                  placeholder={patient.height_cm?.toString() ?? 'e.g. 165'}
                  value={visitHeight} onChange={(e) => onVisitHeightChange(e.target.value)}
                  className="h-12 rounded-xl bg-surface-container-high border-none px-4 focus-visible:ring-2 focus-visible:ring-primary/40" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor="visit-weight" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Weight (kg)</Label>
                  {visitWeight && patient.weight_kg !== null &&
                    !isNaN(parseFloat(visitWeight)) &&
                    Math.abs(parseFloat(visitWeight) - (patient.weight_kg ?? 0)) > 0.01 && (
                    <span className={cn('text-xs font-bold',
                      parseFloat(visitWeight) < (patient.weight_kg ?? 0) ? 'text-primary' : 'text-amber-600'
                    )}>
                      {parseFloat(visitWeight) < (patient.weight_kg ?? 0) ? '▼' : '▲'}{' '}
                      {Math.abs(parseFloat(visitWeight) - (patient.weight_kg ?? 0)).toFixed(1)}
                    </span>
                  )}
                </div>
                <Input id="visit-weight" type="number" min={20} max={350} step={0.1}
                  placeholder={patient.weight_kg?.toString() ?? 'e.g. 65'}
                  value={visitWeight} onChange={(e) => onVisitWeightChange(e.target.value)}
                  className="h-12 rounded-xl bg-surface-container-high border-none px-4 focus-visible:ring-2 focus-visible:ring-primary/40" />
                {originalWeight !== undefined && originalWeight !== null && (
                  <p className="text-xs text-muted-foreground">Previous: {originalWeight} kg</p>
                )}
              </div>
            </div>

            {/* Live BMI / IBW / Change strip */}
            {visitWeight && visitHeight &&
              !isNaN(parseFloat(visitWeight)) && !isNaN(parseFloat(visitHeight)) && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'BMI', value: computeBMI(parseFloat(visitWeight), parseFloat(visitHeight)) },
                  { label: 'Ideal BW', value: computeIBW(parseFloat(visitHeight), patient.gender) !== 'N/A' ? `${computeIBW(parseFloat(visitHeight), patient.gender)} kg` : 'N/A' },
                  { label: 'Change', value: originalWeight != null && !isNaN(parseFloat(visitWeight))
                    ? parseFloat(visitWeight) === originalWeight ? 'No change' : `${parseFloat(visitWeight) > originalWeight ? '+' : ''}${(parseFloat(visitWeight) - originalWeight).toFixed(1)} kg`
                    : 'N/A' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-surface-container-low px-3 py-2 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs font-bold text-on-surface mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <Button type="button" disabled={isSavingMeasurements} onClick={onSaveMeasurements}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold gap-2">
              {isSavingMeasurements
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                : <><CheckCircle2 className="h-4 w-4" /> Save Measurements</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
