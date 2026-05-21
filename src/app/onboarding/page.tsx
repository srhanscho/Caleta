import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { OnboardingForm } from '@/components/features/accounts/onboarding-form'

export const metadata: Metadata = { title: 'Configura tus cuentas' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { accounts: { where: { activa: true } } },
  })

  // If user already has accounts, skip onboarding
  if (prismaUser && prismaUser.accounts.length > 0) {
    redirect('/dashboard')
  }

  return (
    <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-8 shadow-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-[#FAFAFA]">
          ¿Qué cuentas manejas?
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          Agrega tus billeteras y su saldo actual. Puedes editar esto después.
        </p>
      </div>
      <OnboardingForm />
    </div>
  )
}
