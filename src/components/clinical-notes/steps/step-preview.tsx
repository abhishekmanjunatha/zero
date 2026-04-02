'use client'

import { RefObject } from 'react'
import {
  Sparkles, Loader2, Download, MessageCircle, BookmarkPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentType, DocumentBlock } from '@/types/app'

interface PatientSnapshotData {
  name: string
  age: string
  gender: string
  height: string
  weight: string
  bmi: string
  ibw: string
  weightDiff: string
  primaryGoal: string
  activityLevel: string
  medicalConditions: string
  foodAllergies: string
  previousWeight: string
  weightChange: string
}

interface StepPreviewProps {
  docTitle: string
  docType: DocumentType
  includePatientInfo: boolean
  liveSnapshotData: PatientSnapshotData | null
  previewContent: string
  previewContentRef: RefObject<HTMLDivElement | null>
  aiEnhancedBlocks: DocumentBlock[] | null
  aiRawResult: string | null
  isPending: boolean
  pdfPending: boolean
  waPending: boolean
  patient: unknown | null
  onSaveTemplate: () => void
  onDownloadPDF: () => void
  onWhatsApp: () => void
}

export function StepPreview({
  docTitle, docType, includePatientInfo, liveSnapshotData, previewContent,
  previewContentRef, aiEnhancedBlocks, aiRawResult,
  isPending, pdfPending, waPending, patient,
  onSaveTemplate, onDownloadPDF, onWhatsApp,
}: StepPreviewProps) {
  return (
    <div className="space-y-4">
      {/* AI indicator banner */}
      {(aiEnhancedBlocks || aiRawResult) && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-medium text-primary/90">
            {aiRawResult ? 'AI output (unstructured) — editor unchanged' : 'AI Enhanced Preview — your editor content is unchanged'}
          </span>
        </div>
      )}

      {/* Preview card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20">
          <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
          <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Preview</h2>
        </div>
        <div className="px-6 pb-6 pt-4">
          <div ref={previewContentRef} className="space-y-4">
            {/* Document title */}
            <h2 className="text-xl font-bold leading-tight">
              {docTitle || <span className="text-muted-foreground italic font-normal text-base">Untitled Document</span>}
            </h2>

            {/* Patient snapshot */}
            {includePatientInfo && liveSnapshotData && (
              <div className="rounded-xl border bg-surface-container-low p-4 space-y-3" data-pdf-block="section">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Patient Information</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {[
                    { label: 'Name', value: liveSnapshotData.name },
                    { label: 'Age', value: liveSnapshotData.age },
                    { label: 'Gender', value: liveSnapshotData.gender },
                    { label: 'Height', value: liveSnapshotData.height },
                    { label: 'Current Weight', value: liveSnapshotData.weight },
                    { label: 'BMI', value: liveSnapshotData.bmi },
                    { label: 'Ideal Body Weight', value: liveSnapshotData.ibw },
                    { label: 'Weight Difference', value: liveSnapshotData.weightDiff },
                    { label: 'Previous Visit Weight', value: liveSnapshotData.previousWeight },
                    { label: 'Weight Change', value: liveSnapshotData.weightChange },
                    { label: 'Primary Goal', value: liveSnapshotData.primaryGoal },
                    { label: 'Activity Level', value: liveSnapshotData.activityLevel },
                    { label: 'Medical Conditions', value: liveSnapshotData.medicalConditions },
                    { label: 'Food Allergies', value: liveSnapshotData.foodAllergies },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs font-bold text-on-surface-variant">{item.label}</p>
                      <p className="text-xs capitalize mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw AI output */}
            {aiRawResult && (
              <div className="rounded-xl border border-secondary/40 bg-secondary/20 p-4 text-sm whitespace-pre-wrap" data-pdf-block="section">
                {aiRawResult}
              </div>
            )}

            {/* Document sections */}
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewContent }} />
          </div>
        </div>
      </div>

      {/* Secondary actions row */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <Button type="button" variant="outline" disabled={isPending || pdfPending || waPending}
          onClick={onSaveTemplate}
          className="shrink-0 gap-2 rounded-full px-5 border-primary/30 text-primary hover:bg-primary/5">
          <BookmarkPlus className="h-4 w-4" /> Save as Template
        </Button>
        <Button type="button" variant="outline" disabled={isPending || pdfPending || waPending || !patient}
          onClick={onDownloadPDF}
          className="shrink-0 gap-2 rounded-full px-5 border-primary/30 text-primary hover:bg-primary/5">
          {pdfPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PDF
        </Button>
        <Button type="button" variant="outline" disabled={isPending || pdfPending || waPending || !patient}
          onClick={onWhatsApp}
          className="shrink-0 gap-2 rounded-full px-5 border-green-500/30 text-green-700 hover:bg-green-50">
          {waPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Send via WhatsApp
        </Button>
      </div>
    </div>
  )
}
