interface TimelineEventStyle {
  dotClassName: string
  cardClassName: string
}

const DEFAULT_TIMELINE_EVENT_STYLE: TimelineEventStyle = {
  dotClassName: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  cardClassName: 'border-zinc-200/80',
}

export const TIMELINE_EVENT_STYLE_MAP: Record<string, TimelineEventStyle> = {
  appointment_created: {
    dotClassName: 'bg-amber-100 text-amber-700 border-amber-200',
    cardClassName: 'border-amber-100/80',
  },
  appointment_checked_in: {
    dotClassName: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    cardClassName: 'border-indigo-100/80',
  },
  appointment_in_progress: {
    dotClassName: 'bg-primary/15 text-primary border-primary/30',
    cardClassName: 'border-primary/25',
  },
  appointment_completed: {
    dotClassName: 'bg-slate-100 text-slate-600 border-slate-200',
    cardClassName: 'border-slate-200/80',
  },
  appointment_cancelled: {
    dotClassName: 'bg-red-100 text-red-700 border-red-200',
    cardClassName: 'border-red-100/80',
  },
  appointment_no_show: {
    dotClassName: 'bg-orange-100 text-orange-700 border-orange-200',
    cardClassName: 'border-orange-100/80',
  },
  clinical_document_created: {
    dotClassName: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    cardClassName: 'border-cyan-100/80',
  },
  lab_report_uploaded: {
    dotClassName: 'bg-secondary/35 text-secondary-foreground border-secondary/55',
    cardClassName: 'border-secondary/40',
  },
  weight_updated: {
    dotClassName: 'bg-lime-100 text-lime-700 border-lime-200',
    cardClassName: 'border-lime-100/80',
  },
  note_added: {
    dotClassName: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    cardClassName: 'border-zinc-200/80',
  },
}

export function getTimelineEventStyle(eventType: string): TimelineEventStyle {
  return TIMELINE_EVENT_STYLE_MAP[eventType] ?? DEFAULT_TIMELINE_EVENT_STYLE
}
