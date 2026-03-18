import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { safeExtractJson, sanitizePromptValue } from '@/lib/ai/parse'

// ── Safe fallback for any failure path ─────────────────────────────────────
const SAFE_FALLBACK = {
  summary: 'AI analysis could not be completed. Please try again.',
  metrics: [] as unknown[],
  observations: [] as unknown[],
  _meta: { isFallback: true, reason: 'unexpected_error' },
}

// ── Per-item schemas (use z.coerce so AI numbers become strings safely) ─────
//
// z.coerce.string() converts numbers like 5.2 → "5.2" instead of rejecting them.
// .catch() at item level means an invalid item is replaced with the fallback,
// then filtered out — invalid items never crash the array validation.

const metricSchema = z.object({
  name: z.coerce.string().min(1),
  value: z.coerce.string().min(1),
  unit: z.coerce.string().optional().default(''),
  status: z.enum(['normal', 'low', 'high', 'critical']).catch('normal'),
  reference: z.coerce.string().optional().default(''),
})

const observationSchema = z.object({
  type: z.enum(['concern', 'improvement', 'note']).catch('note'),
  text: z.coerce.string().min(1),
})

// ── Top-level schema ────────────────────────────────────────────────────────
//
// Key properties:
// - summary: uses .catch('') so an empty/missing summary never fails the schema.
//   The caller replaces '' with the fallback message.
// - metrics / observations: z.array(z.unknown()).catch([]) handles all cases
//   where the AI returns null, a non-array, or omits the field entirely.
//   Then each item is individually validated and invalid ones are filtered out.
//   This enables PARTIAL DATA HANDLING: a valid summary is kept even if
//   every metric is malformed.

const labAnalysisSchema = z.object({
  summary: z.string().catch(''),
  metrics: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((item) => {
        const r = metricSchema.safeParse(item)
        if (!r.success) {
          console.warn('[AI Lab Analysis] Dropped invalid metric item:', JSON.stringify(item).slice(0, 80))
          return []
        }
        return [r.data]
      })
    ),
  observations: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((item) => {
        const r = observationSchema.safeParse(item)
        if (!r.success) {
          console.warn('[AI Lab Analysis] Dropped invalid observation item:', JSON.stringify(item).slice(0, 80))
          return []
        }
        return [r.data]
      })
    ),
})

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

// ── Request body schema ─────────────────────────────────────────────────────
const requestBodySchema = z.object({
  reportId: z.string().min(1),
  fileUrls: z.array(z.string().url()).min(1).max(10),
  reportType: z.string().max(100).nullish(),
  patientContext: z.record(z.string(), z.unknown()).nullish(),
})

interface AnalyzeRequestBody {
  reportId: string
  fileUrls: string[]
  reportType?: string
  patientContext?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', _meta: { isFallback: true, reason: 'unauthorized' } }, { status: 401 })
  }

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Set OPENROUTER_API_KEY in .env.local.', _meta: { isFallback: true, reason: 'not_configured' } },
      { status: 503 }
    )
  }

  let body: AnalyzeRequestBody
  try {
    const raw = (await request.json()) as unknown
    const parsed = requestBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues[0]?.message, _meta: { isFallback: true, reason: 'validation_error' } },
        { status: 400 }
      )
    }
    body = parsed.data as AnalyzeRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', _meta: { isFallback: true, reason: 'validation_error' } }, { status: 400 })
  }

  const { reportId, fileUrls, reportType, patientContext } = body

  const { data: ownedReport } = await supabase
    .from('lab_reports')
    .select('id')
    .eq('id', reportId)
    .eq('dietitian_id', user.id)
    .maybeSingle()

  if (!ownedReport) {
    return NextResponse.json(
      { error: 'You are not authorized to analyze this report.', _meta: { isFallback: true, reason: 'forbidden' } },
      { status: 403 }
    )
  }

  // ── Sanitize patientContext before prompt interpolation ─────────────────
  const ctx = patientContext ?? {}
  const contextBlock = Object.keys(ctx).length > 0
    ? `\n\nPatient Context:\n` +
      `- Age: ${sanitizePromptValue(ctx.age)}\n` +
      `- Gender: ${sanitizePromptValue(ctx.gender)}\n` +
      `- Primary Goal: ${sanitizePromptValue(ctx.primary_goal)}\n` +
      `- Medical Conditions: ${sanitizePromptValue(ctx.medical_conditions, 300)}\n` +
      `- Food Allergies: ${sanitizePromptValue(ctx.food_allergies, 300)}`
    : ''

  const systemPrompt = `You are a clinical nutrition AI assistant helping a registered dietitian analyze lab reports. The report type is: ${sanitizePromptValue(reportType ?? 'general lab report', 100)}.${contextBlock}

Analyze the lab report and return a JSON object with exactly these fields:
{
  "summary": "A 2-3 sentence readable summary of the key findings",
  "metrics": [
    { "name": "Metric Name", "value": "value with unit", "status": "normal|low|high|critical", "reference": "reference range" }
  ],
  "observations": [
    { "type": "concern|improvement|note", "text": "Brief observation about the finding" }
  ]
}

IMPORTANT: 
- Mark as "AI observation – not a medical diagnosis"
- Flag abnormal values clearly
- Be specific about which values need attention for dietary intervention
- Return ONLY valid JSON, no markdown or explanation`

  try {
    // Build messages — include file URLs as image_url for vision models
    const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [
      {
        type: 'text',
        text: `Analyze this ${sanitizePromptValue(reportType?.replace(/_/g, ' ') ?? 'lab', 50)} report. Extract all metrics and provide observations.`,
      },
    ]

    for (const url of fileUrls) {
      userContent.push({
        type: 'image_url',
        image_url: { url },
      })
    }

    // ── Fetch with 30-second timeout ──────────────────────────────────────
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    let aiResponse: Response
    try {
      aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://zero.app',
          'X-Title': 'Zero Lab Analysis',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          max_tokens: 4096,
          temperature: 0.2,
        }),
        signal: controller.signal,
      })
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      console.error('[AI Lab Analysis] Fetch failed:', isTimeout ? 'timeout after 30s' : String(fetchErr))
      return NextResponse.json(
        {
          error: isTimeout ? 'AI service timed out. Please try again.' : 'AI service temporarily unavailable',
          _meta: { isFallback: true, reason: isTimeout ? 'timeout' : 'provider_error' },
        },
        { status: 502 }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('[AI Lab Analysis] Provider error status:', aiResponse.status, 'body:', errText.slice(0, 200))
      return NextResponse.json(
        { error: 'AI service temporarily unavailable', _meta: { isFallback: true, reason: 'provider_error' } },
        { status: 502 }
      )
    }

    const aiData = (await aiResponse.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const rawResult = aiData.choices?.[0]?.message?.content ?? ''

    console.info('[AI Lab Analysis] Raw response length:', rawResult.length, '| reportId:', reportId)

    if (!rawResult.trim()) {
      console.error('[AI Lab Analysis] Empty response from provider for reportId:', reportId)
      return NextResponse.json({ ...SAFE_FALLBACK, _meta: { isFallback: true, reason: 'empty_response' } })
    }

    // ── Deep safe JSON extraction ─────────────────────────────────────────
    const extracted = safeExtractJson(rawResult)

    if (extracted === null) {
      console.error('[AI Lab Analysis] Failed all JSON extraction attempts. Raw excerpt:', rawResult.slice(0, 300))
      return NextResponse.json({ ...SAFE_FALLBACK, _meta: { isFallback: true, reason: 'parse_failed' } })
    }

    // ── Deep Zod validation with per-item filtering ───────────────────────
    // This schema ALWAYS succeeds (every field has .catch()). Invalid nested
    // items are individually dropped and logged rather than failing the whole response.
    const validated = labAnalysisSchema.parse(extracted)

    const summary = validated.summary.trim() || SAFE_FALLBACK.summary
    const result = { ...validated, summary }

    console.info(
      '[AI Lab Analysis] Validated successfully | metrics:', result.metrics.length,
      '| observations:', result.observations.length,
      '| reportId:', reportId
    )

    return NextResponse.json({ ...result, _meta: { isFallback: false } })
  } catch (err) {
    console.error('[AI Lab Analysis] Unexpected error for reportId:', reportId, '|', String(err))
    return NextResponse.json(SAFE_FALLBACK)
  }
}

