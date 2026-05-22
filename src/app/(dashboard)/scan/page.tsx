import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { ScreenshotUpload } from '@/components/features/transactions/screenshot-upload'

export default async function ScanPage() {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()
  if (!supabaseUser) redirect('/login')

  const prismaUser = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  })
  if (!prismaUser) redirect('/login')

  const accounts = await prisma.account.findMany({
    where: { userId: prismaUser.id, activa: true },
    select: { id: true, nombre: true, tipo: true, color: true },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <main className="pb-24 px-6 pt-8">
      <h1 className="text-xl font-semibold text-foreground mb-6">Escanear comprobante</h1>
      <ScreenshotUpload accounts={accounts} />
    </main>
  )
}
