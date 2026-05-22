// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Upsert ensures the Prisma user exists even if the webhook failed.
  // Falls back to update-by-email when the same email exists under a different auth provider.
  let prismaUser
  try {
    prismaUser = await prisma.user.upsert({
      where: { supabaseId: user.id },
      create: {
        supabaseId: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      },
      update: {},
      include: { accounts: { where: { activa: true } } },
    })
  } catch {
    try {
      prismaUser = await prisma.user.update({
        where: { email: user.email! },
        data: { supabaseId: user.id },
        include: { accounts: { where: { activa: true } } },
      })
    } catch {
      redirect('/login')
    }
  }

  if (prismaUser.accounts.length === 0) {
    redirect('/onboarding')
  }

  return <div className="min-h-screen bg-background">{children}</div>
}
