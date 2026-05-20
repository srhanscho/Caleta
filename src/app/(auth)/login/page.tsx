import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AuthForm } from '@/components/features/auth/auth-form'
import { GoogleButton } from '@/components/features/auth/google-button'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-8 shadow-2xl space-y-6">
      <AuthForm />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#27272A]" />
        <span className="text-xs text-[#A1A1AA]">o</span>
        <div className="h-px flex-1 bg-[#27272A]" />
      </div>
      <GoogleButton />
      <p className="text-center text-xs text-[#A1A1AA]">
        Al continuar aceptas nuestra{' '}
        <a href="/privacidad" className="underline hover:text-[#FAFAFA]">
          política de privacidad
        </a>
      </p>
    </div>
  )
}
