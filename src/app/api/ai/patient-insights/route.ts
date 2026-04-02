import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { chat } from '@/lib/ai/client'
import { safeExtractJson } from '@/lib/ai/parse'
import { buildPatientAIContext, buildLastVisitContext, serializeContextForPrompt } from '@/lib/ai/context-builder'
import { buildJourneySummaryMessages } from '@/lib/ai/prompts/journey-summary'
import { buildLastVisitMessages } from '@/lib/ai/prompts/last-visit'
import { buildPatientExperienceMessages } from '@/lib/ai/prompts/patient-experience'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import type { InsightType, AIMessage } from '@/types/ai'

// ── Request schema ──────────────────────────────────────────────────────────

const requestSchema = z.object({
  patientId: z.string().uuid(),
  insightType: z.enum(['journey', 'last_visit', 'experience']),
})

// ── Response validation schemas ─────────────────────────────────────────────

const combinedScoreSchema = z.object({
  overall: z.number().min(0).max(100).catch(50),
  healthProgress: z.number().min(0).max(100).catch(50),
  engagement: z.number().min(0).max(100).catch(50),
  labTrends: z.number().min(0).max(100).catch(50),
})

const milestoneSchema = z.object({
  date: z.string().catch('Unknown'),
  event: z.string().min(1),
  significance: z.string().catch(''),
})

const journeySchema = z.object({
  journeyOverview: z.string().catch('Unable to generate journey overview.'),
  keyMilestones: z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items
        .flatMap((item) => {
          const parsed = milestoneSchema.safeParse(item)
          return parsed.success ? [parsed.data] : []
        })
        .slice(0, 8)
    ),
  treatmentProgression: z.string().catch('Insufficient data for treatment progression analysis.'),
  labTrends: z.string().catch('No lab data available for trend analysis.'),
  combinedScore: combinedScoreSchema.catch({
    overall: 50,
    healthProgress: 50,
    engagement: 50,
    labTrends: 50,
  }),
  currentStatus: z.string().catch('Unable to determine current status.'),
  recommendations: z
    .array(z.string())
    .catch([])
    .transform((items) => items.slice(0, 5)),
})

const lastVisitSchema = z.object({
  visitDate: z.string().catch('Unknown'),
  purpose: z.string().catch('Unknown'),
  summary: z.string().catch('Unable to generate visit summary.'),
  keyDecisions: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
  prescriptions: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
  labsReviewed: z.string().nullable().catch(null),
  nextSteps: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
})

const experienceSchema = z.object({
  positives: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
  concerns: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
  engagementLevel: z.enum(['high', 'moderate', 'low']).catch('moderate'),
  progressTrajectory: z.enum(['improving', 'stable', 'declining']).catch('stable'),
  interactionSummary: z.string().catch('Unable to generate interaction summary.'),
  improvementSuggestions: z.array(z.string()).catch([]).transform((items) => items.slice(0, 5)),
})

// ── Fallback responses ──────────────────────────────────────────────────────

const JOURNEY_FALLBACK = {
  journeyOverview: 'AI analysis could not be completed. Please try again.',
  keyMilestones: [],
  treatmentProgression: '',
  labTrends: '',
  combinedScore: { overall: 50, healthProgress: 50, engagement: 50, labTrends: 50 },
  currentStatus: '',
  recommendations: [],
}

const LAST_VISIT_FALLBACK = {
  visitDate: 'Unknown',
  purpose: 'Unknown',
  summary: 'AI analysis could not be completed. Please try again.',
  keyDecisions: [],
  prescriptions: [],
  labsReviewed: null,
  nextSteps: [],
}

const EXPERIENCE_FALLBACK = {
  positives: [],
  concerns: [],
  engagementLevel: 'moderate' as const,
  progressTrajectory: 'stable' as const,
  interactionSummary: 'AI analysis could not be completed. Please try again.',
  improvementSuggestions: [],
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting: 10 requests per minute per user
    const rateLimitKey = `ai-insights:${user.id}`
    if (isRateLimited(rateLimitKey, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    // Parse & validate request
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request. Please provide a valid patientId and insightType.' },
        { status: 400 }
      )
    }

    const { patientId, insightType } = parsed.data

    // Build context based on insight type
    let messages: AIMessage[]

    if (insightType === 'last_visit') {
      const { context, error } = await buildLastVisitContext(patientId, user.id)
      if (error || !context) {
        return NextResponse.json({ error: error ?? 'Failed to build context.' }, { status: 404 })
      }
      const serialized = serializeContextForPrompt(context)
      messages = buildLastVisitMessages(serialized)
    } else {
      // Both 'journey' and 'experience' use full context
      const { context, error } = await buildPatientAIContext(patientId, user.id)
      if (error || !context) {
        return NextResponse.json({ error: error ?? 'Failed to build context.' }, { status: 404 })
      }
      const serialized = serializeContextForPrompt(context)
      messages =
        insightType === 'journey'
          ? buildJourneySummaryMessages(serialized)
          : buildPatientExperienceMessages(serialized)
    }

    // Call AI with fallback chain
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)

    let aiResponse
    try {
      aiResponse = await chat(messages, {
        temperature: 0.2,
        maxTokens: 2048,
      })
    } catch (err) {
      clearTimeout(timeout)
      console.error(`[AI Insights] All providers failed for ${insightType}:`, err)
      return NextResponse.json({
        data: getFallback(insightType),
        type: insightType,
        _meta: { isFallback: true, reason: 'all_providers_failed' },
      })
    }
    clearTimeout(timeout)

    // Parse AI response
    const extracted = safeExtractJson(aiResponse.content)
    if (!extracted) {
      console.error(`[AI Insights] Failed to extract JSON from response for ${insightType}`)
      return NextResponse.json({
        data: getFallback(insightType),
        type: insightType,
        _meta: { isFallback: true, reason: 'json_parse_failed' },
      })
    }

    // Validate with Zod
    const validated = validateResponse(insightType, extracted)

    return NextResponse.json({
      data: validated,
      type: insightType,
      _meta: {
        isFallback: false,
        provider: aiResponse.provider,
        model: aiResponse.model,
      },
    })
  } catch (err) {
    console.error('[AI Insights] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getFallback(type: InsightType) {
  switch (type) {
    case 'journey':
      return JOURNEY_FALLBACK
    case 'last_visit':
      return LAST_VISIT_FALLBACK
    case 'experience':
      return EXPERIENCE_FALLBACK
  }
}

function validateResponse(type: InsightType, data: unknown) {
  switch (type) {
    case 'journey':
      return journeySchema.parse(data)
    case 'last_visit':
      return lastVisitSchema.parse(data)
    case 'experience':
      return experienceSchema.parse(data)
  }
}
