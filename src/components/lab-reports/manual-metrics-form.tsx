'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { saveManualMetrics } from '@/actions/lab-reports'

interface ManualMetric {
  name: string
  value: string
  unit: string
  status: 'normal' | 'low' | 'high' | 'critical'
  reference: string
}

const EMPTY_METRIC: ManualMetric = {
  name: '',
  value: '',
  unit: '',
  status: 'normal',
  reference: '',
}

export function ManualMetricsForm({
  reportId,
  existingManualMetrics,
  onSaved,
}: {
  reportId: string
  existingManualMetrics: ManualMetric[]
  onSaved: (metrics: ManualMetric[]) => void
}) {
  const [metrics, setMetrics] = useState<ManualMetric[]>(
    existingManualMetrics.length > 0 ? existingManualMetrics : [{ ...EMPTY_METRIC }]
  )
  const [saving, setSaving] = useState(false)

  const updateMetric = (index: number, field: keyof ManualMetric, value: string) => {
    setMetrics((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  const addRow = () => {
    if (metrics.length >= 20) {
      toast.error('Maximum 20 metrics allowed')
      return
    }
    setMetrics((prev) => [...prev, { ...EMPTY_METRIC }])
  }

  const removeRow = (index: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    const valid = metrics.filter((m) => m.name.trim() && m.value.trim())
    if (valid.length === 0) {
      toast.error('Add at least one metric with name and value')
      return
    }

    setSaving(true)
    try {
      const result = await saveManualMetrics(reportId, valid)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${valid.length} metric${valid.length > 1 ? 's' : ''} saved`)
        onSaved(valid)
      }
    } catch {
      toast.error('Failed to save metrics')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {metrics.map((m, i) => (
          <div key={i} className="grid grid-cols-[1fr_0.6fr_0.5fr_auto_0.7fr_auto] gap-2 items-end">
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Name</label>}
              <input
                type="text"
                placeholder="e.g. Hemoglobin"
                value={m.name}
                onChange={(e) => updateMetric(i, 'name', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Value</label>}
              <input
                type="text"
                placeholder="13.5"
                value={m.value}
                onChange={(e) => updateMetric(i, 'value', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Unit</label>}
              <input
                type="text"
                placeholder="g/dL"
                value={m.unit}
                onChange={(e) => updateMetric(i, 'unit', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</label>}
              <select
                value={m.status}
                onChange={(e) => updateMetric(i, 'status', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="normal">Normal</option>
                <option value="low">Low</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Reference</label>}
              <input
                type="text"
                placeholder="12-16 g/dL"
                value={m.reference}
                onChange={(e) => updateMetric(i, 'reference', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              {i === 0 && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">&nbsp;</label>}
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={metrics.length <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add Metric
        </Button>
        <Button type="button" size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Metrics
        </Button>
      </div>
    </div>
  )
}
