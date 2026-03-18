'use client'

import { useState, useEffect } from 'react'
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Clock,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { compressForLabUpload } from '@/lib/utils/file-compression'

interface PatientUploadFormProps {
  token: string
}

type PageState = 'loading' | 'ready' | 'uploading' | 'success' | 'invalid' | 'expired' | 'used' | 'error'

export function PatientUploadForm({ token }: PatientUploadFormProps) {
  const [state, setState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [patientName, setPatientName] = useState('')
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // Validate token on mount
  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/upload/secure-token?token=${encodeURIComponent(token)}`)
        const data = (await res.json()) as { patientName?: string; error?: string }
        if (!res.ok || data.error) {
          if (res.status === 410) {
            setState('expired')
          } else if (res.status === 409) {
            setState('used')
          } else if (res.status >= 500) {
            setErrorMessage(data.error ?? 'Upload service is temporarily unavailable. Please try again later.')
            setState('error')
          } else {
            setState('invalid')
          }
          return
        }
        setPatientName(data.patientName ?? '')
        setState('ready')
      } catch {
        setErrorMessage('Unable to validate this upload link right now. Please try again later.')
        setState('error')
      }
    }
    validate()
  }, [token])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const accepted = Array.from(selected).filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/png'
    )
    setFiles((prev) => [...prev, ...accepted])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (files.length === 0) return
    setState('uploading')

    try {
      // Upload each file to the secure server-side endpoint.
      // The server validates the token and writes to Supabase Storage.
      const uploadedPaths: string[] = []
      let bytesBefore = 0
      let bytesAfter = 0
      for (const file of files) {
        const compressed = await compressForLabUpload(file)
        const fileToUpload = compressed.file
        bytesBefore += compressed.originalBytes
        bytesAfter += compressed.compressedBytes

        const fileFormData = new FormData()
        fileFormData.append('token', token)
        fileFormData.append('file', fileToUpload)

        const uploadRes = await fetch('/api/upload/lab-file', {
          method: 'POST',
          body: fileFormData,
        })

        const uploadData = (await uploadRes.json()) as { filePath?: string; error?: string }

        if (!uploadRes.ok || !uploadData.filePath) {
          setErrorMessage(uploadData.error ?? 'File upload failed. Please try again.')
          setState('error')
          return
        }

        uploadedPaths.push(uploadData.filePath)
      }

      if (bytesBefore > 0 && bytesAfter < bytesBefore) {
        const saved = Math.round(((bytesBefore - bytesAfter) / bytesBefore) * 100)
        setErrorMessage('')
        console.info(`[PatientUpload] Files optimized by ${saved}% before upload`)
      }

      // Save the real URLs back to the report record (consuming the token)
      const res = await fetch(`/api/upload/secure-token?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_paths: uploadedPaths,
          title: title.trim() || 'Patient Upload',
        }),
      })

      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || data.error) {
        setErrorMessage(data.error ?? 'Upload failed')
        setState('error')
        return
      }

      setState('success')
    } catch {
      setErrorMessage('Upload failed. Please try again.')
      setState('error')
    }
  }

  // ── Loading ──
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">Validating upload link…</p>
      </div>
    )
  }

  // ── Invalid token ──
  if (state === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 max-w-md mx-auto text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <Ban className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold">Invalid upload link</h1>
        <p className="text-sm text-muted-foreground">
          This link is not valid. Please check the URL or ask your dietitian to send a new one.
        </p>
      </div>
    )
  }

  // ── Expired token ──
  if (state === 'expired') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 max-w-md mx-auto text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Clock className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold">This upload link has expired</h1>
        <p className="text-sm text-muted-foreground">
          Upload links expire after 48 hours. Please contact your dietitian to receive a new link.
        </p>
      </div>
    )
  }

  // ── Already used ──
  if (state === 'used') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 max-w-md mx-auto text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold">This upload link has already been used</h1>
        <p className="text-sm text-muted-foreground">
          A report was already submitted via this link. If you need to re-submit, please contact your dietitian.
        </p>
      </div>
    )
  }

  // ── Upload error (post-submit failure) ──
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 max-w-md mx-auto text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold">Unable to Upload</h1>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
      </div>
    )
  }

  // ── Success ──
  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 max-w-md mx-auto text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold">Report Uploaded!</h1>
        <p className="text-sm text-muted-foreground">
          Your lab report has been submitted successfully. Your dietitian will review it shortly.
        </p>
      </div>
    )
  }

  // ── Upload form ──
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-6 mt-8">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mx-auto">
            <FlaskConical className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Upload Lab Report</h1>
          {patientName && (
            <p className="text-sm text-muted-foreground">
              Hi {patientName}, please upload your lab report files below.
            </p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="report-title">Report Title (optional)</Label>
          <Input
            id="report-title"
            placeholder="e.g. Blood Test – March 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* File upload */}
        <div className="space-y-2">
          <Label>
            Files <span className="text-destructive">*</span>
          </Label>
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              PDF, JPG, or PNG — max 20 MB per file
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" /> Choose Files
              </span>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-1.5 mt-3">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={files.length === 0 || state === 'uploading'}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          {state === 'uploading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Submit Report
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          This is a secure upload link. Your file will only be shared with your dietitian.
        </p>
      </div>
    </div>
  )
}
