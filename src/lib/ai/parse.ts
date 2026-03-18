/**
 * AI response parsing utilities.
 *
 * AI is treated as UNTRUSTED INPUT. Every value from an AI provider must pass
 * through these utilities before being used or stored.
 *
 * Do NOT import or use these on the client side — this module is server-only.
 */

// ── Safe JSON extraction ────────────────────────────────────────────────────
//
// Handles all common AI response formats:
//   1. Clean JSON string:              {"key": "value"}
//   2. Markdown fenced JSON:           ```json\n{...}\n```
//   3. JSON embedded in prose:         "Here's the analysis:\n{...}\nLet me know"
//   4. JSON with trailing text:        {...}\n\nNote: this is not medical advice.
//   5. Markdown fence without lang:    ```\n{...}\n```

export function safeExtractJson(raw: string): unknown {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()

  // Attempt 1: parse directly (handles clean JSON)
  try {
    return JSON.parse(trimmed)
  } catch { /* fall through */ }

  // Attempt 2: strip markdown fences (```json...``` or ```...```)
  const fenceStripped = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  try {
    return JSON.parse(fenceStripped)
  } catch { /* fall through */ }

  // Attempt 3: extract JSON object — from first { to the matching last }
  const objStart = trimmed.indexOf('{')
  const objEnd = trimmed.lastIndexOf('}')
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(trimmed.slice(objStart, objEnd + 1))
    } catch { /* fall through */ }
  }

  // Attempt 4: extract JSON array — from first [ to the matching last ]
  const arrStart = trimmed.indexOf('[')
  const arrEnd = trimmed.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(trimmed.slice(arrStart, arrEnd + 1))
    } catch { /* fall through */ }
  }

  return null
}

// ── Server-side markdown stripping ─────────────────────────────────────────
//
// Some AI providers return markdown formatting even when instructed not to.
// Strip it server-side so the client always receives plain text.

export function stripMarkdownServer(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/```[\s\S]*?```/g, '')           // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')   // ***bold-italic***
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold**
    .replace(/\*([^*\n]+)\*/g, '$1')          // *italic*
    .replace(/_{2}([^_]+)_{2}/g, '$1')        // __bold__
    .replace(/_([^_\n]+)_/g, '$1')            // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1') // escaped chars
    .trim()
}

// ── Prompt value sanitizer ──────────────────────────────────────────────────
//
// Sanitize values before interpolating them into AI prompts.
// Prevents excessively long values from inflating token usage.
// Strips newlines that could confuse prompt structure.

export function sanitizePromptValue(value: unknown, maxLen = 200): string {
  if (value === null || value === undefined) return 'N/A'
  const str = String(value)
    .replace(/[\n\r]/g, ' ')   // no newlines in prompt values
    .replace(/\s+/g, ' ')      // collapse whitespace
    .trim()
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}
