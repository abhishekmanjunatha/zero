'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateDocumentTemplate } from '@/actions/templates'
import type { DocumentBlock } from '@/types/app'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type TemplateEditorProps = {
  templateId: string
  initialName: string
  initialBlocks: DocumentBlock[]
}

function createId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function TemplateEditor({
  templateId,
  initialName,
  initialBlocks,
}: TemplateEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(initialName)
  const [blocks, setBlocks] = useState<DocumentBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks.map((b, i) => ({ ...b, order: i }))
      : [{ id: createId(), type: 'custom', label: 'Content', content: '', order: 0 }]
  )

  const canSave = useMemo(() => {
    return name.trim().length > 0 && blocks.length > 0
  }, [name, blocks])

  const updateBlock = (blockId: string, patch: Partial<DocumentBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)))
  }

  const addBlock = () => {
    setBlocks((prev) => [
      ...prev,
      {
        id: createId(),
        type: 'custom',
        label: 'New Section',
        content: '',
        order: prev.length,
      },
    ])
  }

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => {
      const filtered = prev.filter((b) => b.id !== blockId)
      if (filtered.length === 0) {
        return [{ id: createId(), type: 'custom', label: 'Content', content: '', order: 0 }]
      }
      return filtered.map((b, i) => ({ ...b, order: i }))
    })
  }

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]]
      return copy.map((b, i) => ({ ...b, order: i }))
    })
  }

  const handleSave = () => {
    if (!canSave) {
      toast.error('Template name and at least one section are required')
      return
    }

    startTransition(async () => {
      const result = await updateDocumentTemplate(templateId, {
        name: name.trim(),
        blocks,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Template updated')
      router.push('/templates')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PCOS Follow-up Template"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Template Blocks</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addBlock} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Block
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.map((block, idx) => (
            <div key={block.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <Input
                  value={block.label}
                  onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                  className="h-8 text-sm font-medium border-0 bg-transparent px-1 focus-visible:ring-1"
                  placeholder="Section name"
                />
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={idx === 0}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="rounded p-1 hover:bg-destructive/10 text-destructive"
                    title="Remove block"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Default content for this block"
                rows={4}
                className="resize-none"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pb-8">
        <Button
          type="button"
          disabled={isPending || !canSave}
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-full px-5"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Template
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push('/templates')}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
