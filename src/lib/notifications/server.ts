import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { NotificationType } from '@/types/notifications'

interface EmitNotificationInput {
  dietitianId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string | null
  patientId?: string | null
  metadata?: Json
}

export async function emitNotification(
  supabase: SupabaseClient<Database>,
  input: EmitNotificationInput
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({
      dietitian_id: input.dietitianId,
      patient_id: input.patientId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? ({} as Json),
    })

  if (error) {
    console.error('[Notifications] emitNotification error:', error.message, {
      type: input.type,
      dietitianId: input.dietitianId,
      patientId: input.patientId ?? null,
    })
  }
}
