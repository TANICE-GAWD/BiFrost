import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]) } catch {}
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month } = await request.json()
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month, use YYYY-MM' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .maybeSingle()

  if (existing && existing.status !== 'failed') {
    return NextResponse.json(existing)
  }

  const [y, m] = month.split('-').map(Number)
  const start  = `${y}-${String(m).padStart(2, '0')}-01`
  const nm     = m === 12 ? 1 : m + 1
  const ny     = m === 12 ? y + 1 : y
  const end    = `${ny}-${String(nm).padStart(2, '0')}-01`

  const { data: sessions } = await supabaseAdmin
    .from('sessions')
    .select('id, activity_date, activity_type, employer_org, hours, verified, document_id')
    .eq('user_id', user.id)
    .gte('activity_date', start)
    .lt('activity_date', end)

  const totalHours = (sessions ?? []).reduce((sum, s) => sum + Number(s.hours), 0)

  if (totalHours < 80) {
    return NextResponse.json(
      { error: `${totalHours.toFixed(1)} hours logged — 80 required to submit` },
      { status: 422 }
    )
  }

  const verifiedHours = (sessions ?? []).filter(s => s.verified).reduce((sum, s) => sum + Number(s.hours), 0)

  const packet = {
    schema_version:        'bifrost-v1',
    generated_at:          new Date().toISOString(),
    member_id:             user.id,
    period:                month,
    requirement_met:       true,
    total_hours:           Math.round(totalHours * 10) / 10,
    verified_hours:        Math.round(verifiedHours * 10) / 10,
    required_hours:        80,
    compliance_percentage: Math.round((totalHours / 80) * 100),
    sessions:              (sessions ?? []).map(s => ({
      id:       s.id,
      date:     s.activity_date,
      type:     s.activity_type,
      employer: s.employer_org,
      hours:    Math.round(Number(s.hours) * 10) / 10,
      verified: s.verified,
    })),
  }

  let fortunaRef: string | null = null
  let status: 'submitted' | 'failed' = 'submitted'

  const fortunaUrl = process.env.FORTUNA_INTAKE_URL
  if (fortunaUrl) {
    try {
      const res = await fetch(fortunaUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(packet),
      })
      const body = await res.json().catch(() => ({}))
      fortunaRef = body.ref ?? body.id ?? null
      if (!res.ok) status = 'failed'
    } catch {
      status = 'failed'
    }
  }

  const { data: submission, error } = await supabaseAdmin
    .from('submissions')
    .upsert(
      {
        user_id:      user.id,
        month,
        status,
        submitted_at: new Date().toISOString(),
        fortuna_ref:  fortunaRef,
      },
      { onConflict: 'user_id,month' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to record submission' }, { status: 500 })

  return NextResponse.json(submission, { status: status === 'submitted' ? 200 : 502 })
}
