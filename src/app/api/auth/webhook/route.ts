import { prisma } from '@/lib/prisma'
import { createHmac, timingSafeEqual } from 'crypto'
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

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret).update(body).digest('hex')
  const expected = Buffer.from(`sha256=${hmac}`)
  const received = Buffer.from(signature)
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-supabase-signature') ?? ''
  const secret = process.env.SUPABASE_WEBHOOK_SECRET ?? ''

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

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
