'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientLookup } from '@/components/shared/patient-lookup'
import { cn } from '@/lib/utils'

interface PatientSearchCommandProps {
  className?: string
}

export function PatientSearchCommand({ className }: PatientSearchCommandProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSelect = (patientId: string) => {
    setQuery('')
    router.push(`/patients/${patientId}`)
  }

  return (
    <div className={cn('relative', className)}>
      <PatientLookup
        value={query}
        onValueChange={setQuery}
        onSelect={(patient) => handleSelect(patient.id)}
        placeholder="Search patients by name, ID, or phone..."
        inputClassName="h-10 rounded-lg focus:border-emerald-500 focus:ring-emerald-500"
        emptyMessage={query.trim() ? `No patients found for "${query}"` : 'No patients found'}
      />
    </div>
  )
}
