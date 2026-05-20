'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()

  if (error) return { exists: false }

  const exists = data.users.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  return { exists }
}
