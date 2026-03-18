// Secure file upload endpoint for patient lab report uploads.
// This route validates the upload token server-side, then uploads the file
// directly to Supabase Storage using the service role client (patient has no auth session).
// The service role key is never exposed to the client.

import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientIp, isRateLimited } from '@/lib/rate-limit'
import { optimizePdfBuffer } from '@/lib/pdf/optimize-server'

export const runtime = 'nodejs'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateKey = `/api/upload/lab-file:POST:${ip}`
  if (isRateLimited(rateKey, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const token = formData.get('token')
  const file = formData.get('file')

  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Upload token is required' }, { status: 400 })
  }
  const normalizedToken = token.trim()

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'A valid file is required' }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PDF, JPG, and PNG files are allowed' },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File size must be under 20 MB' },
      { status: 400 }
    )
  }

  // Validate token with service role because this endpoint is intentionally public.
  let serviceClient
  try {
    serviceClient = createServiceClient()
  } catch (e) {
    console.error('[Lab File Upload] Service client init failed:', e)
    return NextResponse.json(
      { error: 'File upload service is unavailable. Please contact support.' },
      { status: 503 }
    )
  }

  const supabase = serviceClient
  const { data: report } = await supabase
    .from('lab_reports')
    .select('id, dietitian_id, patient_id, token_expires_at, file_urls, upload_source, patients!inner(id, dietitian_id)')
    .eq('upload_token', normalizedToken)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Invalid or expired upload link' }, { status: 404 })
  }

  const row = report as {
    id: string
    dietitian_id: string
    patient_id: string
    token_expires_at: string | null
    file_urls: string[]
    upload_source: 'patient' | 'dietitian'
    patients: { id: string; dietitian_id: string }
  }

  if (
    row.upload_source !== 'patient' ||
    row.patients.id !== row.patient_id ||
    row.patients.dietitian_id !== row.dietitian_id
  ) {
    return NextResponse.json({ error: 'Invalid upload source for token' }, { status: 403 })
  }

  if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This upload link has expired' }, { status: 410 })
  }

  if (row.file_urls && row.file_urls.length > 0) {
    return NextResponse.json(
      { error: 'This upload link has already been used' },
      { status: 409 }
    )
  }

  // ── Upload to Supabase Storage via service role (patient has no auth session) ──
  const fileName = file instanceof File ? file.name : 'upload'
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'file'
  const safeName = `${Date.now()}-${crypto.randomUUID()}.${ext}`
  // Scope path to dietitian ID to maintain folder-based isolation
  const path = `${row.dietitian_id}/${row.id}/${safeName}`

  const fileBuffer = Buffer.from(await file.arrayBuffer())
  let uploadBuffer: Uint8Array = fileBuffer
  if (file.type === 'application/pdf') {
    const optimized = await optimizePdfBuffer(fileBuffer)
    if (optimized.optimized) {
      uploadBuffer = optimized.buffer
      console.info(
        `[Lab File Upload] PDF optimized with ${optimized.method}: ${fileBuffer.length} -> ${uploadBuffer.length} bytes`
      )
    }
  }

  const { error: uploadError } = await serviceClient.storage
    .from('lab-reports')
    .upload(path, uploadBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[Lab File Upload] Storage upload failed:', uploadError.message)
    return NextResponse.json(
      { error: 'File could not be saved. Please try again.' },
      { status: 500 }
    )
  }

  // Return private storage path. Caller persists this and gets signed URLs later.
  return NextResponse.json({ filePath: path })
}
