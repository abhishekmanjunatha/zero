'use server'

// AI Server Actions
// Thin wrappers that call the internal API routes.
// All AI calls are server-side only — API keys never exposed to browser.

import type { InsightType } from '@/types/ai'

/**
 * Generate AI-powered patient insights (journey, last visit, experience).
 * Calls the /api/ai/patient-insights endpoint internally.
 */
export async function generatePatientInsight(
  patientId: string,
  insightType: InsightType
): Promise<{ data?: unknown; error?: string }> {
  try {
    // Server actions run on the server but need a full URL for fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/ai/patient-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, insightType }),
    })

    const result = await res.json()
    if (!res.ok || result.error) {
      return { error: result.error ?? 'Failed to generate insight.' }
    }
    return { data: result.data }
  } catch {
    return { error: 'AI service is temporarily unavailable.' }
  }
}
