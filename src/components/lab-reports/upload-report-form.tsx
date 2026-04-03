'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Upload,
  X,
  FileText,
  Loader2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PatientLookup } from '@/components/shared/patient-lookup'
import { createClient } from '@/lib/supabase/client'
import { compressForLabUpload } from '@/lib/utils/file-compression'
import { REPORT_TYPE_LABELS } from '@/lib/constants/labels'
import { uploadLabReport } from '@/actions/lab-reports'

interface PatientResult {
  id: string
  full_name: string
  patient_code: string
  phone: string | null
}

function createUploadNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function extensionForMimeType(type: string) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'application/pdf') return 'pdf'
  return 'file'
}

interface UploadReportFormProps {
  initialPatientId?: string
  lockPatient?: boolean
}

export function UploadReportForm({ initialPatientId, lockPatient = false }: UploadReportFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPatientId = initialPatientId ?? searchParams.get('patient')

  const [isPending, startTransition] = useTransition()

  // Patient search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [reportType, setReportType] = useState<string>('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  // Pre-select patient from URL
  useEffect(() => {
    if (!preselectedPatientId) return
    const fetchPatient = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, patient_code, phone')
        .eq('id', preselectedPatientId)
        .single()
      if (data) setSelectedPatient(data as PatientResult)
    }
    fetchPatient()
  }, [preselectedPatientId])

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient)
    setSearchQuery('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return
    const accepted = Array.from(selected).filter(
      (f) =>
        f.type === 'application/pdf' ||
        f.type === 'image/jpeg' ||
        f.type === 'image/png'
    )
    if (accepted.length < selected.length) {
      toast.error('Only PDF, JPG, and PNG files are accepted')
    }
    setFiles((prev) => [...prev, ...accepted])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a report title')
      return
    }
    if (files.length === 0) {
      toast.error('Please upload at least one file')
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not authenticated')
        setUploading(false)
        return
      }

      // Upload files to private Supabase Storage and persist storage paths.
      const uploadedPaths: string[] = []
      let bytesBefore = 0
      let bytesAfter = 0
      for (const file of files) {
        const compressed = await compressForLabUpload(file)
        const fileToUpload = compressed.file
        bytesBefore += compressed.originalBytes
        bytesAfter += compressed.compressedBytes

        const ext = extensionForMimeType(fileToUpload.type)
        const path = `${user.id}/${selectedPatient.id}/${Date.now()}-${createUploadNonce()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('lab-reports')
          .upload(path, fileToUpload, { contentType: fileToUpload.type })
        if (uploadError) {
          toast.error(`Failed to upload \`${file.name}\`. Please try again.`)
          setUploading(false)
          return
        }
        uploadedPaths.push(path)
      }

      if (bytesBefore > 0 && bytesAfter < bytesBefore) {
        const saved = Math.round(((bytesBefore - bytesAfter) / bytesBefore) * 100)
        toast.success(`Upload optimized: ${saved}% smaller before storage save`)
      }

      setUploading(false)

      // Create report record
      startTransition(async () => {
        const result = await uploadLabReport({
          patient_id: selectedPatient.id,
          title: title.trim(),
          report_type: reportType || undefined,
          file_urls: uploadedPaths,
        })
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('Report uploaded successfully')
        router.push(`/patients/${selectedPatient.id}/lab-reports/${result.reportId}`)
      })
    } catch (error) {
      console.error('[UploadReportForm] handleSubmit failed:', error)
      toast.error('Failed to upload report. Please try again.')
      setUploading(false)
    }
  }

  const isSubmitting = uploading || isPending

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Patient selection */}
      {!selectedPatient ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientLookup
              value={searchQuery}
              onValueChange={setSearchQuery}
              onSelect={handleSelectPatient}
              placeholder="Search by name, phone, or patient ID..."
              inputClassName="h-10 rounded-lg focus:border-emerald-500 focus:ring-emerald-500"
              emptyMessage={searchQuery.trim() ? `No patients found for "${searchQuery}"` : 'No patients found'}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPatient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{selectedPatient.patient_code}</code>
                <span className="mx-1.5">·</span>{selectedPatient.phone}
              </p>
            </div>
            {!lockPatient && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPatient(null)}
                className="shrink-0"
              >
                Change
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report details */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-title">
                  Report Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="report-title"
                  placeholder="e.g. Complete Blood Count – March 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Auto-detect by AI">
                      {(value: string) => value ? (REPORT_TYPE_LABELS[value as keyof typeof REPORT_TYPE_LABELS] ?? value) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood_test">Blood Test</SelectItem>
                    <SelectItem value="thyroid_panel">Thyroid Panel</SelectItem>
                    <SelectItem value="vitamin_panel">Vitamin Panel</SelectItem>
                    <SelectItem value="lipid_profile">Lipid Profile</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>
                Upload Files <span className="text-destructive">*</span>
              </Label>
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  PDF, JPG, PNG — max 20 MB per file
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

              {/* File list */}
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
                        className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {selectedPatient && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? 'Uploading…' : isPending ? 'Saving…' : 'Upload Report'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
