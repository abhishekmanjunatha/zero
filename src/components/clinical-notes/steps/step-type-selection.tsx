'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveSelect } from '@/components/ui/responsive-select'
import type { DocumentType } from '@/types/app'
import type { DocTemplate } from '../composer-helpers'

interface StepTypeSelectionProps {
  docType: DocumentType
  docTitle: string
  includePatientInfo: boolean
  selectedTemplateId: string | null
  localTemplates: DocTemplate[]
  onDocTypeChange: (v: string) => void
  onTitleChange: (v: string) => void
  onIncludePatientInfoChange: (v: boolean) => void
}

export function StepTypeSelection({
  docType, docTitle, includePatientInfo, selectedTemplateId,
  localTemplates, onDocTypeChange, onTitleChange, onIncludePatientInfoChange,
}: StepTypeSelectionProps) {
  const docTypeOptions = [
    { value: 'quick_note', label: 'Quick Note' },
    { value: 'meal_plan', label: 'Meal Plan' },
    { value: 'follow_up_recommendation', label: 'Follow-up Recommendation' },
    { value: 'custom', label: 'Custom Document' },
    ...localTemplates
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ value: t.id, label: t.name })),
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20">
        <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
        <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Document Type</h2>
      </div>
      <div className="px-6 pb-6 pt-4 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Type</Label>
          <ResponsiveSelect
            value={selectedTemplateId ?? docType}
            onValueChange={(v) => { if (v) onDocTypeChange(v) }}
            options={docTypeOptions}
            sheetTitle="Select Document Type"
            className="h-12 rounded-xl bg-surface-container-high border-none px-4 font-normal focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-title" className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
            Document Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="doc-title"
            placeholder="e.g. Weight Loss Meal Plan - Week 1"
            value={docTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-12 rounded-xl bg-surface-container-high border-none px-4 focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 p-4">
          <Checkbox
            id="include-patient-info"
            checked={includePatientInfo}
            onCheckedChange={(checked) => onIncludePatientInfoChange(checked === true)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label htmlFor="include-patient-info" className="cursor-pointer text-sm font-medium">
              Include Patient Information
            </Label>
            <p className="text-xs text-muted-foreground">
              Patient snapshot (BMI, goals, allergies) will appear in the document PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
