import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireApiKey } from '@/lib/requireApiKey'

function monthBounds(month: string): { start: string; end: string; deadline: string } {
  const [y, m] = month.split('-').map(Number)
  const start    = `${y}-${String(m).padStart(2, '0')}-01`
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  const end      = `${ny}-${String(nm).padStart(2, '0')}-01`
  const lastDay  = new Date(y, m, 0).getDate()
  const deadline = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
  return { start, end, deadline }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requireApiKey(request)
  if (denied) return denied

  const memberId = params.id
  const rawMonth = request.nextUrl.searchParams.get('month')
  const now      = new Date()
  const month    = rawMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month format, use YYYY-MM' }, { status: 400 })
  }

  const { start, end, deadline } = monthBounds(month)

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('activity_type, hours, verified')
    .eq('user_id', memberId)
    .gte('activity_date', start)
    .lt('activity_date', end)

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const breakdown = {
    work:      { hours: 0, sessions: 0 },
    education: { hours: 0, sessions: 0 },
    volunteer: { hours: 0, sessions: 0 },
  } as Record<string, { hours: number; sessions: number }>

  let totalHours    = 0
  let verifiedHours = 0

  for (const s of sessions ?? []) {
    const h = Number(s.hours)
    totalHours += h
    if (s.verified) verifiedHours += h
    const type = s.activity_type as string
    if (breakdown[type]) {
      breakdown[type].hours    += h
      breakdown[type].sessions += 1
    }
  }

  const required       = 80
  const confidenceScore = totalHours > 0 ? Math.round((verifiedHours / totalHours) * 100) / 100 : 0
  const status = totalHours >= required ? 'GREEN' : totalHours >= 60 ? 'YELLOW' : 'RED'

  return NextResponse.json({
    status,
    member_id:        memberId,
    month,
    current_hours:    Math.round(totalHours    * 10) / 10,
    verified_hours:   Math.round(verifiedHours * 10) / 10,
    required_hours:   required,
    deadline,
    confidence_score: confidenceScore,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, { hours: Math.round(v.hours * 10) / 10, sessions: v.sessions }])
    ),
  })
}
