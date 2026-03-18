// SECURITY: This module is SERVER-SIDE ONLY.
// It uses the Supabase service role key which bypasses Row Level Security.
// NEVER import this in client components or any file that could reach the browser.
// Only use in API routes and server actions that require admin-level storage operations.

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
