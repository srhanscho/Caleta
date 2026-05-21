'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkEmail(email: string): Promise<{ exists: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) return { exists: false }

  try {
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error || !data) return { exists: false }

    const exists = data.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    return { exists }
  } catch {
    return { exists: false }
  }
}
