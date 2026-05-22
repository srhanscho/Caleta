import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
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
    <div className="space-y-6">
      <div className="flex justify-center">
        <Image src="/logo.png" alt="Caleta" width={140} height={48} priority />
      </div>
      <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl space-y-6">
        <AuthForm />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton />
        <p className="text-center text-xs text-muted-foreground">
          Al continuar aceptas nuestra{' '}
          <a href="/privacidad" className="underline hover:text-foreground">
            política de privacidad
          </a>
        </p>
      </div>
    </div>
  )
}
