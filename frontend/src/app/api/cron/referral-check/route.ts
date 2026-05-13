import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = new Date()
  if (today.getDate() <= 15) {
    return NextResponse.json({ triggered: 0, reason: 'before mid-month cutoff' })
  }

  const year  = today.getFullYear()
  const month = today.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  const monthEnd = `${ny}-${String(nm).padStart(2, '0')}-01`
  const currentMonth = `${year}-${String(month).padStart(2, '0')}`

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('user_id, hours')
    .gte('activity_date', monthStart)
    .lt('activity_date', monthEnd)

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const hoursByUser = new Map<string, number>()
  for (const s of sessions ?? []) {
    hoursByUser.set(s.user_id, (hoursByUser.get(s.user_id) ?? 0) + Number(s.hours))
  }

  const atRisk = [...hoursByUser.entries()].filter(([, h]) => h < 10)

  const webhookUrl = process.env.UNITE_US_WEBHOOK_URL
  let triggered = 0
  const errors: string[] = []

  for (const [userId, hours] of atRisk) {
    if (!webhookUrl) break

    try {
      await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:     'referral_trigger',
          timestamp: today.toISOString(),
          member: {
            user_id:       userId,
            current_hours: Math.round(hours * 10) / 10,
            required_hours: 80,
            hours_gap:     Math.round((80 - hours) * 10) / 10,
            month:         currentMonth,
          },
          referral_type: 'employment_assistance',
          reason:        'Member logged fewer than 10 CE hours past mid-month',
        }),
      })
      triggered++
    } catch (e) {
      errors.push(userId)
    }
  }

  return NextResponse.json({
    triggered,
    at_risk_count: atRisk.length,
    webhook_configured: !!webhookUrl,
    errors: errors.length ? errors : undefined,
  })
}
