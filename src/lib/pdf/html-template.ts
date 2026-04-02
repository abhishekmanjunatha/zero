/**
 * HTML + CSS template builder for clinical document PDFs.
 *
 * Produces a self-contained HTML string (inline styles, no external assets)
 * that Puppeteer renders to a professional A4 PDF.
 *
 * Layout:
 *   - Fixed header: logo (left) + dietitian details (right)
 *   - Body: title → patient grid → section cards
 *   - Fixed footer: clinic info, timestamp, branding
 */

import type { DocumentBlock, DocumentType } from '@/types/app'

// ── Public types ──────────────────────────────────────────────────────────

export interface PDFDietitianData {
  name: string
  qualification: string
  licenseNumber: string
  clinicName: string
  address: string
  phone: string
  email: string
  logoUrl?: string
}

export interface PDFPatientSnapshot {
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

export interface PDFTemplateData {
  docTitle: string
  documentType: DocumentType
  dietitian: PDFDietitianData
  patientSnapshot?: PDFPatientSnapshot | null
  blocks: DocumentBlock[]
  siteName?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTimestamp(): string {
  const d = new Date()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const h24 = d.getHours()
  const h12 = h24 % 12 || 12
  const min = d.getMinutes().toString().padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} | ${h12}:${min} ${ampm}`
}

// Default Strive logo as inline SVG (used when no clinic logo is uploaded)
const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
  <rect width="120" height="40" rx="6" fill="#f0f4f8"/>
  <text x="60" y="25" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#2563eb">Strive</text>
</svg>`

// ── CSS ───────────────────────────────────────────────────────────────────

const CSS = `
  @page {
    size: A4;
    margin: 0;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 210mm;
    min-height: 297mm;
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    display: flex;
    flex-direction: column;
    padding: 0 18mm;
  }

  /* ─── Header ─────────────────────────────────────────── */

  .header {
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16mm 0 10px 0;
    border-bottom: 1.5px solid #dde2e8;
    margin-bottom: 14px;
  }

  .header-logo {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .header-logo img {
    max-height: 44px;
    max-width: 160px;
    object-fit: contain;
  }

  .header-info {
    text-align: right;
    line-height: 1.35;
  }

  .header-name {
    font-size: 18px;
    font-weight: 800;
    color: #111111;
    letter-spacing: -0.2px;
  }

  .header-detail {
    font-size: 10.5px;
    font-weight: 400;
    color: #444444;
    margin-top: 1px;
  }

  /* ─── Body ───────────────────────────────────────────── */

  .body {
    flex: 1;
  }

  .doc-title {
    text-align: center;
    font-size: 17px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #111111;
    margin-bottom: 16px;
    padding-top: 4px;
  }

  /* ─── Patient Snapshot ───────────────────────────────── */

  .snapshot-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }

  .snapshot-heading {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #64748b;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }

  .snapshot-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px 20px;
  }

  .snapshot-cell {
    min-width: 0;
  }

  .snapshot-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #6b7280;
    margin-bottom: 1px;
  }

  .snapshot-value {
    font-size: 11.5px;
    font-weight: 600;
    color: #111827;
    text-transform: capitalize;
    word-break: break-word;
  }

  /* ─── Section Cards ──────────────────────────────────── */

  .section-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 12px;
    break-inside: avoid;
  }

  .section-heading {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1e293b;
    border-left: 3px solid #2563eb;
    padding-left: 10px;
    margin-bottom: 8px;
  }

  .section-body {
    font-size: 11px;
    font-weight: 400;
    color: #222222;
    white-space: pre-wrap;
    line-height: 1.65;
    word-break: break-word;
  }

  /* ─── Footer ─────────────────────────────────────────── */

  .footer {
    flex-shrink: 0;
    text-align: center;
    border-top: 1px solid #b0b3b7;
    padding: 10px 0 14mm 0;
    margin-top: 16px;
    line-height: 1.4;
  }

  .footer-clinic {
    font-size: 9px;
    font-weight: 600;
    color: #333333;
  }

  .footer-address {
    font-size: 8.5px;
    font-weight: 400;
    color: #555555;
    margin-top: 1px;
  }

  .footer-meta {
    font-size: 8px;
    font-weight: 400;
    color: #555555;
    margin-top: 2px;
  }

  .footer-meta strong {
    font-weight: 700;
    color: #333333;
  }

  .footer-powered {
    font-size: 8px;
    font-weight: 700;
    color: #333333;
    margin-top: 2px;
  }
`

// ── Template builder ──────────────────────────────────────────────────────

export function buildDocumentHTML(data: PDFTemplateData): string {
  const {
    docTitle,
    dietitian,
    patientSnapshot,
    blocks,
    siteName = 'Strive',
  } = data

  const timestamp = formatTimestamp()

  // Filter out internal block types
  const contentBlocks = blocks.filter(
    (b) => b.type !== 'title' && b.type !== 'patient_snapshot'
  )

  // ── Header ────────────────────────────────────────────

  const logoHtml = dietitian.logoUrl
    ? `<img src="${escapeHtml(dietitian.logoUrl)}" alt="Clinic Logo" />`
    : DEFAULT_LOGO_SVG

  const headerHtml = `
    <div class="header">
      <div class="header-logo">${logoHtml}</div>
      <div class="header-info">
        <div class="header-name">${escapeHtml(dietitian.name.toUpperCase())}</div>
        ${dietitian.qualification ? `<div class="header-detail">${escapeHtml(dietitian.qualification)}</div>` : ''}
        ${dietitian.licenseNumber ? `<div class="header-detail">License No: ${escapeHtml(dietitian.licenseNumber)}</div>` : ''}
        ${dietitian.email ? `<div class="header-detail">${escapeHtml(dietitian.email)}</div>` : ''}
      </div>
    </div>`

  // ── Title ─────────────────────────────────────────────

  const titleHtml = `<div class="doc-title">${escapeHtml(docTitle.trim() || 'Document')}</div>`

  // ── Patient snapshot ──────────────────────────────────

  let snapshotHtml = ''
  if (patientSnapshot) {
    const fields: { label: string; value: string }[] = [
      { label: 'Name', value: patientSnapshot.name },
      { label: 'Age', value: patientSnapshot.age },
      { label: 'Gender', value: patientSnapshot.gender },
      { label: 'Height', value: patientSnapshot.height },
      { label: 'Current Weight', value: patientSnapshot.weight },
      { label: 'BMI', value: patientSnapshot.bmi },
      { label: 'Ideal Body Weight', value: patientSnapshot.ibw },
      { label: 'Weight Difference', value: patientSnapshot.weightDiff },
      { label: 'Previous Visit Weight', value: patientSnapshot.previousWeight },
      { label: 'Weight Change', value: patientSnapshot.weightChange },
      { label: 'Primary Goal', value: patientSnapshot.primaryGoal },
      { label: 'Activity Level', value: patientSnapshot.activityLevel },
      { label: 'Medical Conditions', value: patientSnapshot.medicalConditions },
      { label: 'Food Allergies', value: patientSnapshot.foodAllergies },
    ]

    const cellsHtml = fields
      .map(
        (f) => `
        <div class="snapshot-cell">
          <div class="snapshot-label">${escapeHtml(f.label)}</div>
          <div class="snapshot-value">${escapeHtml(f.value || 'N/A')}</div>
        </div>`
      )
      .join('')

    snapshotHtml = `
      <div class="snapshot-card">
        <div class="snapshot-heading">Patient Information</div>
        <div class="snapshot-grid">${cellsHtml}</div>
      </div>`
  }

  // ── Content sections ──────────────────────────────────

  const sectionsHtml = contentBlocks
    .map((block) => {
      const body = block.content?.trim()
        ? escapeHtml(block.content.trim())
        : '<span style="color:#94a3b8;font-style:italic;">No content</span>'

      return `
        <div class="section-card">
          <div class="section-heading">${escapeHtml(block.label)}</div>
          <div class="section-body">${body}</div>
        </div>`
    })
    .join('')

  // ── Footer ────────────────────────────────────────────

  const phoneEmail = [
    dietitian.phone ? `Phone: ${escapeHtml(dietitian.phone)}` : '',
    dietitian.email ? escapeHtml(dietitian.email) : '',
  ]
    .filter(Boolean)
    .join(' | ')

  const metaLine = [phoneEmail, `Generated on <strong>${escapeHtml(timestamp)}</strong>`]
    .filter(Boolean)
    .join(' | ')

  const footerHtml = `
    <div class="footer">
      ${dietitian.clinicName ? `<div class="footer-clinic">${escapeHtml(dietitian.clinicName)}</div>` : ''}
      ${dietitian.address ? `<div class="footer-address">${escapeHtml(dietitian.address)}</div>` : ''}
      ${metaLine ? `<div class="footer-meta">${metaLine}</div>` : ''}
      <div class="footer-powered">Powered by ${escapeHtml(siteName)}</div>
    </div>`

  // ── Assemble full HTML ────────────────────────────────

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(docTitle || 'Document')}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    <div class="body">
      ${titleHtml}
      ${snapshotHtml}
      ${sectionsHtml}
    </div>
    ${footerHtml}
  </div>
</body>
</html>`
}
