import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  const secret = process.env.FORTUNA_WEBHOOK_SECRET
  if (secret && request.headers.get('x-fortuna-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_id, month, fortuna_ref } = await request.json()

  if (!user_id || !month) {
    return NextResponse.json({ error: 'user_id and month are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .update({
      status:       'confirmed',
      confirmed_at: new Date().toISOString(),
      fortuna_ref:  fortuna_ref ?? null,
    })
    .eq('user_id', user_id)
    .eq('month', month)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  return NextResponse.json({ ok: true, submission: data })
}
