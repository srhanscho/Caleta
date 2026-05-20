'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-muted-foreground">Dashboard — próximamente (RF-03)</p>
      <button
        onClick={handleLogout}
        className="text-sm text-red-400 hover:underline cursor-pointer"
      >
        Cerrar sesión
      </button>
    </main>
  )
}
