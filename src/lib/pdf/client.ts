/**
 * Client-side PDF service.
 *
 * Calls the server-side PDF generation API (/api/pdf/generate)
 * and returns the result as a Blob for download or upload.
 */

import type { DocumentBlock, DocumentType } from '@/types/app'
import type { PDFDietitianData, PDFPatientSnapshot } from '@/lib/pdf/html-template'

// ── Types ─────────────────────────────────────────────────────────────────

export interface GeneratePDFInput {
  docTitle: string
  documentType: DocumentType
  dietitian: PDFDietitianData
  patientSnapshot?: PDFPatientSnapshot | null
  blocks: DocumentBlock[]
  siteName?: string
}

export interface GeneratedPDFResult {
  blob: Blob
  filename: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildPDFFileName(docTitle: string): string {
  return (
    docTitle
      .trim()
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '_') || 'document'
  )
}

// ── Public API ────────────────────────────────────────────────────────────

export async function generatePDFBlobFromServer(
  input: GeneratePDFInput
): Promise<GeneratedPDFResult> {
  const response = await fetch('/api/pdf/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docTitle: input.docTitle,
      documentType: input.documentType,
      dietitian: input.dietitian,
      patientSnapshot: input.patientSnapshot ?? null,
      blocks: input.blocks,
      siteName: input.siteName,
    }),
  })

  if (!response.ok) {
    let errorMessage = 'PDF generation failed'
    try {
      const errorData = await response.json()
      if (errorData?.error) errorMessage = errorData.error
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage)
  }

  const blob = await response.blob()
  const filename = buildPDFFileName(input.docTitle)

  return { blob, filename }
}

export async function downloadPDFFromServer(
  input: GeneratePDFInput
): Promise<void> {
  const { blob, filename } = await generatePDFBlobFromServer(input)

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${filename}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}
