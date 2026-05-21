import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'

type WebhookRecord = {
  id: string
  email: string
  raw_user_meta_data?: { full_name?: string; name?: string }
}

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: WebhookRecord
}

export async function POST(request: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET
  if (secret) {
    const token = request.nextUrl.searchParams.get('token')
    if (token !== secret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const body = await request.text()
  const payload: WebhookPayload = JSON.parse(body)

  if (payload.type !== 'INSERT' || payload.table !== 'users') {
    return NextResponse.json({ ok: true })
  }

  const { id: supabaseId, email, raw_user_meta_data } = payload.record
  const name =
    raw_user_meta_data?.full_name ?? raw_user_meta_data?.name ?? null

  await prisma.user.upsert({
    where: { supabaseId },
    update: { email, name },
    create: { supabaseId, email, name },
  })

  return NextResponse.json({ ok: true })
}
