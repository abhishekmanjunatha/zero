'use client'

import {
  Plus, Trash2, GripVertical, ArrowUp, ArrowDown,
  Sparkles, Heart, Lightbulb, Loader2,
  X, CheckCircle2, RotateCcw, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import type { DocumentBlock } from '@/types/app'

interface StepContentEditorProps {
  blocks: DocumentBlock[]
  onUpdateContent: (blockId: string, content: string) => void
  onUpdateLabel: (blockId: string, label: string) => void
  onAddBlock: () => void
  onRemoveBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, direction: 'up' | 'down') => void
  aiLoading: string | null
  aiSuggestions: string | null
  aiEnhancedBlocks: DocumentBlock[] | null
  aiRawResult: string | null
  aiMeta: { isFallback: boolean; reason?: string } | null
  lastAiAction: 'enhance' | 'patient_friendly' | 'suggest' | null
  showAISheet: boolean
  step: number
  onCallAI: (action: 'enhance' | 'patient_friendly' | 'suggest') => void
  onApplyAI: () => void
  onDiscardAI: () => void
  onSetAiSuggestions: (v: string | null) => void
  onToggleAISheet: (v: boolean) => void
}

export function StepContentEditor({
  blocks, onUpdateContent, onUpdateLabel, onAddBlock, onRemoveBlock, onMoveBlock,
  aiLoading, aiSuggestions, aiEnhancedBlocks, aiRawResult, aiMeta, lastAiAction,
  showAISheet, step,
  onCallAI, onApplyAI, onDiscardAI, onSetAiSuggestions, onToggleAISheet,
}: StepContentEditorProps) {
  return (
    <div className="space-y-4">
      {/* Content blocks */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-outline-variant/20">
          <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
          <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Document Content</h2>
          <span className="ml-auto text-xs font-medium text-muted-foreground">{blocks.length} section{blocks.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="px-6 pb-6 pt-4 space-y-3">
          {blocks.map((block, idx) => (
            <div key={block.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-low/60 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input value={block.label} onChange={(e) => onUpdateLabel(block.id, e.target.value)}
                  className="h-10 flex-1 rounded-lg bg-surface-container-high border-none px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/40"
                  placeholder="Section name" />
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => onMoveBlock(block.id, 'up')} disabled={idx === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors" title="Move up">
                    <ArrowUp className="h-3.5 w-3.5 text-on-surface-variant" />
                  </button>
                  <button type="button" onClick={() => onMoveBlock(block.id, 'down')} disabled={idx === blocks.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors" title="Move down">
                    <ArrowDown className="h-3.5 w-3.5 text-on-surface-variant" />
                  </button>
                  {blocks.length > 1 && (
                    <button type="button" onClick={() => onRemoveBlock(block.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Remove section">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Textarea value={block.content} onChange={(e) => onUpdateContent(block.id, e.target.value)}
                placeholder={block.type === 'instructions' ? 'e.g. Drink 3L water daily, avoid refined sugar...' : `Enter ${block.label.toLowerCase()} details...`}
                rows={4} className="resize-none rounded-xl bg-surface-container-high border-none px-4 py-3 text-sm focus-visible:ring-2 focus-visible:ring-primary/40" />
              {(() => {
                const enhanced = aiEnhancedBlocks?.find((ab) => ab.id === block.id)
                if (!enhanced || !enhanced.content || enhanced.content === block.content) return null
                return (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> AI Version
                    </p>
                    <p className="text-sm whitespace-pre-wrap text-on-surface leading-relaxed">{enhanced.content}</p>
                  </div>
                )
              })()}
            </div>
          ))}

          <button type="button" onClick={onAddBlock}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant py-3 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
            <Plus className="h-4 w-4" /> Add Section
          </button>
        </div>
      </div>

      {/* AI Assistance — desktop CollapsibleSection */}
      <div className="hidden lg:block">
        <CollapsibleSection title="AI Assistance" subtitle="Enhance, simplify, or suggest plan content"
          icon={<Sparkles className="h-4 w-4 text-primary" />} className="app-surface" defaultOpen={false} contentClassName="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2" disabled={aiLoading !== null} onClick={() => onCallAI('enhance')}>
              {aiLoading === 'enhance' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
              {aiLoading === 'enhance' ? 'Enhancing...' : 'Enhance with AI'}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" disabled={aiLoading !== null} onClick={() => onCallAI('patient_friendly')}>
              {aiLoading === 'patient_friendly' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5 text-pink-500" />}
              {aiLoading === 'patient_friendly' ? 'Formatting...' : 'Format for Patient'}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" disabled={aiLoading !== null} onClick={() => onCallAI('suggest')}>
              {aiLoading === 'suggest' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5 text-amber-500" />}
              {aiLoading === 'suggest' ? 'Generating...' : 'AI Suggestions'}
            </Button>
          </div>
          {aiMeta?.isFallback === true && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">AI could not fully process this. Showing limited or fallback results.</p>
                {aiMeta.reason && ['timeout', 'parse_failed', 'invalid_structure'].includes(aiMeta.reason) && (
                  <p className="text-xs text-amber-700 mt-0.5 capitalize">Reason: {aiMeta.reason.replace(/_/g, ' ')}</p>
                )}
              </div>
              {lastAiAction && (
                <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => onCallAI(lastAiAction)} disabled={aiLoading !== null}>
                  {aiLoading !== null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry AI
                </Button>
              )}
            </div>
          )}
          {aiSuggestions && (
            <div className="rounded-lg border bg-amber-50 p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-amber-800 flex items-center gap-1.5"><Lightbulb className="h-4 w-4" /> AI Suggestions</p>
                <button type="button" onClick={() => onSetAiSuggestions(null)} className="text-amber-600 hover:text-amber-800"><X className="h-4 w-4" /></button>
              </div>
              <div className="whitespace-pre-wrap text-amber-900">{aiSuggestions}</div>
            </div>
          )}
          {(aiEnhancedBlocks || aiRawResult) && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-primary">AI enhancement ready</p>
              </div>
              <p className="text-xs text-primary/85">Your original content is unchanged. Review the preview, then decide.</p>
              <div className="flex items-center gap-2">
                {aiEnhancedBlocks && (
                  <Button type="button" size="sm" onClick={onApplyAI} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Apply AI Changes
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={onDiscardAI} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Discard
                </Button>
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* AI FAB — mobile only */}
      {step === 3 && (
        <button type="button" onClick={() => onToggleAISheet(true)}
          className="fixed bottom-44 right-4 z-[55] lg:hidden flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="AI Assistant">
          <Sparkles className="h-6 w-6 text-white" />
        </button>
      )}

      {/* AI Bottom Sheet — mobile only */}
      {showAISheet && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={(e) => { if (e.target === e.currentTarget) onToggleAISheet(false) }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-5 pt-5 pb-8 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
              </h3>
              <button type="button" onClick={() => onToggleAISheet(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-container-low">
                <X className="h-4 w-4 text-on-surface-variant" />
              </button>
            </div>
            <div className="space-y-2">
              {([
                { action: 'enhance' as const, icon: <Sparkles className="h-4 w-4" />, label: 'Enhance with AI', loadingLabel: 'Enhancing...', color: 'text-primary' },
                { action: 'patient_friendly' as const, icon: <Heart className="h-4 w-4" />, label: 'Format for Patient', loadingLabel: 'Formatting...', color: 'text-pink-500' },
                { action: 'suggest' as const, icon: <Lightbulb className="h-4 w-4" />, label: 'AI Suggestions', loadingLabel: 'Generating...', color: 'text-amber-500' },
              ] as const).map(({ action, icon, label, loadingLabel, color }) => (
                <button key={action} type="button" disabled={aiLoading !== null}
                  onClick={() => { onCallAI(action); onToggleAISheet(false) }}
                  className="w-full flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors">
                  <span className={color}>{aiLoading === action ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}</span>
                  {aiLoading === action ? loadingLabel : label}
                </button>
              ))}
            </div>
            {(aiEnhancedBlocks || aiRawResult) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <p className="text-sm font-semibold text-primary flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> AI enhancement ready</p>
                <p className="text-xs text-on-surface-variant">Review in Preview step, then apply.</p>
                <div className="flex gap-2">
                  {aiEnhancedBlocks && (
                    <Button type="button" size="sm" onClick={() => { onApplyAI(); onToggleAISheet(false) }}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Apply
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => { onDiscardAI(); onToggleAISheet(false) }} className="flex-1 gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" /> Discard
                  </Button>
                </div>
              </div>
            )}
            {aiMeta?.isFallback === true && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">AI returned limited results. {aiMeta.reason ? `Reason: ${aiMeta.reason.replace(/_/g, ' ')}` : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
