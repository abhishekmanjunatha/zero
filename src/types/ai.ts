export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'gemini'

export type AIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIRequestOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
  provider?: AIProvider
}

export type AIResponse = {
  content: string
  provider: AIProvider
  model: string
}

// ── Patient AI Insights ──────────────────────────────────────────────────

export type InsightType = 'journey' | 'last_visit' | 'experience'

export type DeidentifiedDemographics = {
  age: number | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  bmi: number | null
}

export type DeidentifiedLifestyle = {
  activity_level: string | null
  sleep_hours: number | null
  work_type: string | null
  dietary_type: string | null
  primary_goal: string | null
}

export type DeidentifiedMedical = {
  conditions: string[]
  allergies: string[]
}

export type DeidentifiedAppointment = {
  date: string
  time: string
  purpose: string
  custom_purpose: string | null
  status: string
  mode: string
  notes: string | null
}

export type DeidentifiedClinicalNote = {
  date: string
  document_type: string
  title: string
  content_summary: string
  version: number
}

export type DeidentifiedLabReport = {
  date: string
  report_type: string | null
  title: string
  ai_summary: string | null
  metrics: Array<{ name: string; value: string; status: string }>
  observations: Array<{ type: string; text: string }>
}

export type DeidentifiedTimelineEvent = {
  date: string
  event_type: string
  event_data: Record<string, unknown>
}

export type DeidentifiedPatientContext = {
  demographics: DeidentifiedDemographics
  lifestyle: DeidentifiedLifestyle
  medical: DeidentifiedMedical
  appointments: DeidentifiedAppointment[]
  clinicalNotes: DeidentifiedClinicalNote[]
  labReports: DeidentifiedLabReport[]
  timeline: DeidentifiedTimelineEvent[]
  patientSince: string
  lastVisitAt: string | null
  totalAppointments: number
  completedAppointments: number
}

export type CombinedScore = {
  overall: number
  healthProgress: number
  engagement: number
  labTrends: number
}

export type KeyMilestone = {
  date: string
  event: string
  significance: string
}

export type JourneySummaryResponse = {
  journeyOverview: string
  keyMilestones: KeyMilestone[]
  treatmentProgression: string
  labTrends: string
  combinedScore: CombinedScore
  currentStatus: string
  recommendations: string[]
}

export type LastVisitSummaryResponse = {
  visitDate: string
  purpose: string
  summary: string
  keyDecisions: string[]
  prescriptions: string[]
  labsReviewed: string | null
  nextSteps: string[]
}

export type PatientExperienceResponse = {
  positives: string[]
  concerns: string[]
  engagementLevel: 'high' | 'moderate' | 'low'
  progressTrajectory: 'improving' | 'stable' | 'declining'
  interactionSummary: string
  improvementSuggestions: string[]
}

export type PatientInsightResponse =
  | { type: 'journey'; data: JourneySummaryResponse }
  | { type: 'last_visit'; data: LastVisitSummaryResponse }
  | { type: 'experience'; data: PatientExperienceResponse }
