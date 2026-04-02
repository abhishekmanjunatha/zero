import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sanitizePromptValue } from '@/lib/ai/parse'
import { chat } from '@/lib/ai/client'
import { isRateLimited } from '@/lib/rate-limit'
import type { AIMessage } from '@/types/ai'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1'

// Whether to use the multi-provider fallback chain instead of direct OpenRouter
const USE_FALLBACK_CHAIN = true

// Max characters of document content sent to AI.
// Prevents runaway token usage and prompt injection via huge documents.
const MAX_CONTENT_LENGTH = 10_000

type EnhanceAction = 'enhance' | 'patient_friendly' | 'suggest'

// ── Request body schema ─────────────────────────────────────────────────────
const requestBodySchema = z.object({
  action: z.enum(['enhance', 'patient_friendly', 'suggest']),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH, {
    message: `Document content must be under ${MAX_CONTENT_LENGTH} characters`,
  }),
  docType: z.string().max(100).optional(),
  docTitle: z.string().max(200).optional(),
  patientContext: z.record(z.string(), z.unknown()).optional(),
})


export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', result: '', _meta: { isFallback: true, reason: 'unauthorized' } }, { status: 401 })
  }

  // Rate limiting: 15 requests per minute per user
  if (isRateLimited(`ai-enhance:${user.id}`, 15, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.', result: '', _meta: { isFallback: true, reason: 'rate_limited' } },
      { status: 429 }
    )
  }

  if (!USE_FALLBACK_CHAIN && !OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured. Set OPENROUTER_API_KEY in .env.local.', result: '', _meta: { isFallback: true, reason: 'not_configured' } },
      { status: 503 }
    )
  }

  // ── Validate and parse request body ──────────────────────────────────────
  let action: EnhanceAction
  let content: string
  let docType: string | undefined
  let docTitle: string | undefined
  let patientContext: Record<string, unknown> | undefined

  try {
    const raw = (await request.json()) as unknown
    const parsed = requestBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.issues[0]?.message, result: '', _meta: { isFallback: true, reason: 'validation_error' } },
        { status: 400 }
      )
    }
    ;({ action, content, docType, docTitle, patientContext } = parsed.data)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', result: '', _meta: { isFallback: true, reason: 'validation_error' } }, { status: 400 })
  }

  // ── Sanitize patientContext before prompt interpolation ───────────────────
  const ctx = patientContext ?? {}
  const contextBlock = Object.keys(ctx).length > 0
    ? `\n\nPatient Context:\n` +
      `- Age: ${sanitizePromptValue(ctx.age)}\n` +
      `- Gender: ${sanitizePromptValue(ctx.gender)}\n` +
      `- Height: ${sanitizePromptValue(ctx.height_cm)} cm\n` +
      `- Weight: ${sanitizePromptValue(ctx.weight_kg)} kg\n` +
      `- Primary Goal: ${sanitizePromptValue(ctx.primary_goal)}\n` +
      `- Activity Level: ${sanitizePromptValue(ctx.activity_level)}\n` +
      `- Dietary Type: ${sanitizePromptValue(ctx.dietary_type)}\n` +
      `- Medical Conditions: ${sanitizePromptValue(ctx.medical_conditions, 300)}\n` +
      `- Food Allergies: ${sanitizePromptValue(ctx.food_allergies, 300)}`
    : ''

  const docTypeLabel =
    docType === 'meal_plan' ? 'Meal Plan'
    : docType === 'quick_note' ? 'Quick Note'
    : docType === 'follow_up_recommendation' ? 'Follow-up Recommendation'
    : 'Clinical Document'

  const titleLine = docTitle ? `\nDocument Title: ${sanitizePromptValue(docTitle, 200)}` : ''
  const isNutritionDoc = docType === 'meal_plan'

  const systemPrompts: Record<EnhanceAction, string> = {
    enhance: isNutritionDoc
      ? `You are a clinical nutrition assistant improving a structured meal plan document. The document has sections marked with ## headings (e.g. ## Breakfast, ## Lunch). You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order
2. Improve the content within each section for clarity, specificity, and professionalism
3. Do NOT add new sections, introductions, summaries, or preambles
4. Do NOT include patient background information inside the output — use it only to tailor the content
    5. Start your response directly with the first ## heading — no introductory text
    6. Every section heading must be on its own line in this exact format: ## <Section Label>${contextBlock}`
      : `You are a clinical documentation assistant enhancing a structured document.
Document Type: ${docTypeLabel}${titleLine}

STRICT RULES:
1. Only enhance, reformat, or clarify the exact content the user has provided. Do NOT invent or add unrelated content.
2. Do NOT generate nutrition plans, meal plans, or dietary recommendations unless the document explicitly contains them.
3. Preserve the intent and subject matter of the original content completely.
4. Return the document using the EXACT SAME ## headings in the same order.
5. Improve grammar, clarity, structure, and professional formatting only.
6. Start your response directly with the first ## heading — no introductory text.
7. Every section heading must be on its own line in this exact format: ## <Section Label>.${contextBlock}`,
    patient_friendly: isNutritionDoc
      ? `You are a nutrition communication specialist rewriting a structured meal plan for patients. The document has sections marked with ## headings. You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order
2. Rewrite content within each section in simple, warm, conversational language — no medical jargon
3. Do NOT add introductions, conclusions, or patient background information in the output
4. Do NOT add new sections — only rewrite existing ones
5. Start your response directly with the first ## heading — no introductory text
6. Every section heading must be on its own line in this exact format: ## <Section Label>${contextBlock}`
      : `You are a clinical communication specialist rewriting a ${docTypeLabel.toLowerCase()} for patients.
Document Type: ${docTypeLabel}${titleLine}

STRICT RULES:
1. Rewrite only the content provided in simple, clear, friendly language a patient can easily understand.
2. Do NOT generate unrelated content, nutrition plans, or medical advice not already present in the original.
3. Preserve the subject matter of the original document completely.
4. Return the document using the EXACT SAME ## headings in the same order.
5. Start your response directly with the first ## heading — no introductory text.
6. Every section heading must be on its own line in this exact format: ## <Section Label>.${contextBlock}`,
    suggest: `You are a dietitian's AI assistant. Based on the patient context and the document content below, provide 3-5 brief, actionable health suggestions relevant to the document's context and the patient's specific conditions and goals. Format each as a bullet point starting with an emoji. Return only the suggestions.${contextBlock}`,
  }
  // ── Doc-type specific prompt overrides ───────────────────────────────────────────
  const isFollowUp = docType === 'follow_up_recommendation'
  const isQuickNote = docType === 'quick_note'

  if (isFollowUp) {
    systemPrompts.enhance = `You are a clinical documentation assistant improving a follow-up recommendation. The document has sections marked with ## headings (Progress Summary, Recommendations, Next Steps). You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order
2. Improve clinical clarity, structure, and professional tone
3. Do NOT add new sections, introductions, or preambles
4. Do NOT include patient background information in the output — use it only to tailor content
5. Start your response directly with the first ## heading — no introductory text
6. Every section heading must be on its own line in this exact format: ## <Section Label>${contextBlock}`
    systemPrompts.patient_friendly = `You are a clinical communication specialist rewriting a follow-up recommendation for patients. The document has sections marked with ## headings. You MUST follow these rules exactly:
1. Return the document using the EXACT SAME ## headings in the same order
2. Rewrite each section in simple, warm, encouraging language — no medical jargon
3. Do NOT add new sections or change the structure
4. Preserve all clinical recommendations — only simplify the language
5. Start your response directly with the first ## heading — no introductory text
6. Every section heading must be on its own line in this exact format: ## <Section Label>${contextBlock}`
    systemPrompts.suggest = `You are a healthcare AI assistant. Based on the patient context and follow-up document below, provide 3-5 brief, actionable suggestions to support the patient's progress toward their goals. Format each as a bullet point starting with an emoji. Return only the suggestions.${contextBlock}`
  } else if (isQuickNote) {
    systemPrompts.enhance = `You are a clinical documentation assistant improving a short clinical note. You MUST follow these rules exactly:
1. If the note has ## headings, return using the EXACT SAME headings in the same order
2. Improve grammar, clarity, and professional language
3. Keep the note concise — do NOT expand it into a lengthy document
4. Do NOT add clinical assessments, diagnoses, or content not already present
5. Preserve the exact intent and subject of the original note
6. Start your response directly with the content — no preamble${contextBlock}`
    systemPrompts.patient_friendly = `You are a clinical communication specialist simplifying a short clinical note for patients. You MUST follow these rules exactly:
1. If the note has ## headings, return using the EXACT SAME headings in the same order
2. Rewrite in simple, warm language a patient can understand — no medical jargon
3. Keep it brief — do NOT expand the content significantly
4. Preserve all factual information — only simplify the language
5. Start your response directly with the content — no preamble${contextBlock}`
  }
  const systemPrompt = systemPrompts[action]

  try {
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ]

    if (USE_FALLBACK_CHAIN) {
      // ── Use multi-provider fallback chain ────────────────────────────────
      let aiResponse
      try {
        aiResponse = await chat(messages, {
          temperature: 0.4,
          maxTokens: 2048,
        })
      } catch (err) {
        console.error('[AI Document Enhancement] All providers failed | action:', action, '|', String(err))
        return NextResponse.json(
          {
            error: 'AI service temporarily unavailable. Please try again.',
            result: '',
            _meta: { isFallback: true, reason: 'all_providers_failed' },
          },
          { status: 502 }
        )
      }

      const rawResult = aiResponse.content ?? ''

      console.info('[AI Document Enhancement] Response length:', rawResult.length, '| action:', action, '| provider:', aiResponse.provider)

      if (!rawResult.trim()) {
        console.error('[AI Document Enhancement] Empty response | action:', action)
        return NextResponse.json(
          { error: 'AI returned an empty response. Please try again.', result: '', _meta: { isFallback: true, reason: 'empty_response' } },
          { status: 502 }
        )
      }

      return NextResponse.json({
        result: rawResult.trim(),
        _meta: { isFallback: false, provider: aiResponse.provider, model: aiResponse.model },
      })
    }

    // ── Legacy: Direct OpenRouter fetch with 30-second timeout ─────────────
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
          'X-Title': 'Zero Clinical Notes',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content },
          ],
          max_tokens: 2048,
          temperature: 0.4,
        }),
        signal: controller.signal,
      })
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      console.error(
        '[AI Document Enhancement] Fetch failed:',
        isTimeout ? 'timeout after 30s' : String(fetchErr),
        '| action:', action
      )
      return NextResponse.json(
        {
          error: isTimeout ? 'AI service timed out. Please try again.' : 'AI service temporarily unavailable',
          result: '',
          _meta: { isFallback: true, reason: isTimeout ? 'timeout' : 'provider_error' },
        },
        { status: 502 }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text()
      console.error('[AI Document Enhancement] Provider error:', aiResponse.status, errText.slice(0, 200))
      return NextResponse.json(
        { error: 'AI service temporarily unavailable', result: '', _meta: { isFallback: true, reason: 'provider_error' } },
        { status: 502 }
      )
    }

    const aiData = (await aiResponse.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const rawResult = aiData.choices?.[0]?.message?.content ?? ''

    console.info('[AI Document Enhancement] Raw response length:', rawResult.length, '| action:', action)

    if (!rawResult.trim()) {
      console.error('[AI Document Enhancement] Empty response from provider | action:', action)
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try again.', result: '', _meta: { isFallback: true, reason: 'empty_response' } },
        { status: 502 }
      )
    }

    const result = rawResult.trim()

    if (!result) {
      console.error('[AI Document Enhancement] Result empty after markdown strip | action:', action)
      return NextResponse.json(
        { error: 'AI returned unusable content. Please try again.', result: '', _meta: { isFallback: true, reason: 'empty_response' } },
        { status: 502 }
      )
    }

    return NextResponse.json({ result, _meta: { isFallback: false } })
  } catch (err) {
    console.error('[AI Document Enhancement] Unexpected error | action:', action, '|', String(err))
    return NextResponse.json(
      { error: 'AI request failed', result: '', _meta: { isFallback: true, reason: 'unexpected_error' } },
      { status: 500 }
    )
  }
}

