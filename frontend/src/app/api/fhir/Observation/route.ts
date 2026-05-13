import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireApiKey } from '@/lib/requireApiKey'

const FHIR_SYSTEM = 'http://bifrost.health/fhir/ce-codes'

const CE_CODES: Record<string, { code: string; display: string }> = {
  work:      { code: 'CE-WORK', display: 'Community Engagement - Work Activity' },
  education: { code: 'CE-EDU',  display: 'Community Engagement - Education Activity' },
  volunteer: { code: 'CE-VOL',  display: 'Community Engagement - Volunteer Activity' },
}

function sessionToObservation(s: {
  id: string
  user_id: string
  activity_type: string
  activity_date: string
  hours: number
  employer_org: string
  verified: boolean
}) {
  const coding = CE_CODES[s.activity_type] ?? { code: 'CE-OTHER', display: 'Community Engagement - Other' }
  return {
    resourceType: 'Observation',
    id: s.id,
    status: 'final',
    code: {
      coding: [{ system: FHIR_SYSTEM, code: coding.code, display: coding.display }],
    },
    subject: { reference: `Patient/${s.user_id}` },
    effectiveDateTime: s.activity_date,
    valueQuantity: {
      value:  Math.round(Number(s.hours) * 10) / 10,
      unit:   'h',
      system: 'http://unitsofmeasure.org',
      code:   'h',
    },
    component: [
      {
        code: { coding: [{ system: FHIR_SYSTEM, code: 'employer' }] },
        valueString: s.employer_org,
      },
      {
        code: { coding: [{ system: FHIR_SYSTEM, code: 'verified' }] },
        valueBoolean: s.verified,
      },
    ],
  }
}

export async function GET(request: NextRequest) {
  const denied = requireApiKey(request)
  if (denied) return denied

  const { searchParams } = request.nextUrl
  const patientId = searchParams.get('patient')
  const date      = searchParams.get('date')

  if (!patientId) {
    return NextResponse.json({ error: 'patient parameter is required' }, { status: 400 })
  }

  let query = supabaseAdmin
    .from('sessions')
    .select('id, user_id, activity_type, activity_date, hours, employer_org, verified')
    .eq('user_id', patientId)
    .order('activity_date', { ascending: true })

  if (date) {
    if (!/^\d{4}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM' }, { status: 400 })
    }
    const [y, m] = date.split('-').map(Number)
    const start  = `${y}-${String(m).padStart(2, '0')}-01`
    const nm     = m === 12 ? 1 : m + 1
    const ny     = m === 12 ? y + 1 : y
    const end    = `${ny}-${String(nm).padStart(2, '0')}-01`
    query = query.gte('activity_date', start).lt('activity_date', end)
  }

  const { data: sessions, error } = await query
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const entries = (sessions ?? []).map(s => ({
    fullUrl:  `https://bifrost.health/fhir/Observation/${s.id}`,
    resource: sessionToObservation(s),
  }))

  return NextResponse.json(
    {
      resourceType: 'Bundle',
      type:         'searchset',
      total:        entries.length,
      entry:        entries,
    },
    {
      headers: { 'Content-Type': 'application/fhir+json' },
    }
  )
}
