import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { buildDocumentHTML, type PDFTemplateData, type PDFDietitianData, type PDFPatientSnapshot } from '@/lib/pdf/html-template'
import { renderHTMLToPDF } from '@/lib/pdf/render-server'

// Allow up to 60 seconds for Chromium cold-start + PDF render on Vercel
export const maxDuration = 60

// ── Request validation ────────────────────────────────────────────────────

const blockSchema = z.object({
  id: z.string(),
  type: z.enum(['title', 'meal_section', 'instructions', 'custom', 'patient_snapshot']),
  label: z.string().max(200),
  content: z.string().max(50_000),
  order: z.number(),
})

const dietitianSchema = z.object({
  name: z.string().max(200),
  qualification: z.string().max(300),
  licenseNumber: z.string().max(100),
  clinicName: z.string().max(200),
  address: z.string().max(500),
  phone: z.string().max(50),
  email: z.string().max(200),
  logoUrl: z.string().max(2000).optional(),
})

const snapshotSchema = z.object({
  name: z.string().max(200),
  age: z.string().max(20),
  gender: z.string().max(50),
  height: z.string().max(20),
  weight: z.string().max(20),
  bmi: z.string().max(20),
  ibw: z.string().max(20),
  weightDiff: z.string().max(30),
  primaryGoal: z.string().max(100),
  activityLevel: z.string().max(100),
  medicalConditions: z.string().max(500),
  foodAllergies: z.string().max(500),
  previousWeight: z.string().max(20),
  weightChange: z.string().max(30),
})

const requestBodySchema = z.object({
  docTitle: z.string().min(1).max(300),
  documentType: z.enum(['quick_note', 'meal_plan', 'follow_up_recommendation', 'custom']),
  dietitian: dietitianSchema,
  patientSnapshot: snapshotSchema.nullable().optional(),
  blocks: z.array(blockSchema).min(1).max(50),
  siteName: z.string().max(50).optional(),
})

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Rate limit: 20 PDF generations per minute
  const ip = getClientIp(request)
  const rateLimitKey = `pdf-gen:${user.id}:${ip}`
  if (isRateLimited(rateLimitKey, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Too many PDF requests. Please wait a moment and try again.' },
      { status: 429 }
    )
  }

  // Parse & validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = requestBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { docTitle, documentType, dietitian, patientSnapshot, blocks, siteName } = parsed.data

  // If the dietitian has a remote logo URL, fetch it and convert to a base64
  // data URI so the HTML is fully self-contained for Puppeteer. This avoids
  // relying on Chromium making an outbound network request inside a Lambda,
  // and lets us use the faster 'domcontentloaded' waitUntil strategy.
  let resolvedLogoUrl: string | undefined = dietitian.logoUrl || undefined
  if (resolvedLogoUrl?.startsWith('https://')) {
    try {
      const imgResponse = await fetch(resolvedLogoUrl)
      if (imgResponse.ok) {
        const contentType = imgResponse.headers.get('content-type') ?? 'image/jpeg'
        const buffer = await imgResponse.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        resolvedLogoUrl = `data:${contentType};base64,${base64}`
      } else {
        resolvedLogoUrl = undefined // fall back to Strive SVG
      }
    } catch {
      resolvedLogoUrl = undefined // fall back to Strive SVG
    }
  }

  // Build HTML
  const templateData: PDFTemplateData = {
    docTitle,
    documentType,
    dietitian: { ...(dietitian as PDFDietitianData), logoUrl: resolvedLogoUrl },
    patientSnapshot: (patientSnapshot ?? null) as PDFPatientSnapshot | null,
    blocks: blocks as PDFTemplateData['blocks'],
    siteName,
  }

  const html = buildDocumentHTML(templateData)

  // Render PDF
  try {
    const pdfBuffer = await renderHTMLToPDF(html)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(docTitle)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF] generation failed:', err)
    return NextResponse.json(
      { error: 'PDF generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
