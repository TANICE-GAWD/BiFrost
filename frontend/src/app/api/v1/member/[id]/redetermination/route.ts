import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireApiKey } from '@/lib/requireApiKey'

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start  = `${y}-${String(m).padStart(2, '0')}-01`
  const nm     = m === 12 ? 1 : m + 1
  const ny     = m === 12 ? y + 1 : y
  const end    = `${ny}-${String(nm).padStart(2, '0')}-01`
  return { start, end }
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

  const { start, end } = monthBounds(month)

  const { data: sessions, error: sessErr } = await supabaseAdmin
    .from('sessions')
    .select('id, activity_date, activity_type, employer_org, hours, verified, document_id')
    .eq('user_id', memberId)
    .gte('activity_date', start)
    .lt('activity_date', end)
    .order('activity_date', { ascending: true })

  if (sessErr) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  const docIds = [...new Set((sessions ?? []).map(s => s.document_id).filter(Boolean))] as string[]

  const { data: documents } = docIds.length
    ? await supabaseAdmin.from('documents').select('id, storage_path, original_name, extracted_hours').in('id', docIds)
    : { data: [] }

  const docMap = new Map((documents ?? []).map(d => [d.id, d]))

  const signedSessions = await Promise.all(
    (sessions ?? []).map(async s => {
      let evidenceUrl: string | null = null
      if (s.document_id) {
        const doc = docMap.get(s.document_id)
        if (doc?.storage_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from('documents')
            .createSignedUrl(doc.storage_path, 3600)
          evidenceUrl = signed?.signedUrl ?? null
        }
      }
      return {
        id:           s.id,
        date:         s.activity_date,
        type:         s.activity_type,
        employer:     s.employer_org,
        hours:        Math.round(Number(s.hours) * 10) / 10,
        verified:     s.verified,
        evidence_url: evidenceUrl,
      }
    })
  )

  const evidenceSummary = await Promise.all(
    (documents ?? []).map(async doc => {
      const { data: signed } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 3600)
      return {
        document_id:     doc.id,
        original_name:   doc.original_name,
        extracted_hours: doc.extracted_hours ? Math.round(Number(doc.extracted_hours) * 10) / 10 : null,
        storage_url:     signed?.signedUrl ?? null,
      }
    })
  )

  const totalHours    = signedSessions.reduce((sum, s) => sum + s.hours, 0)
  const verifiedHours = signedSessions.filter(s => s.verified).reduce((sum, s) => sum + s.hours, 0)
  const required      = 80

  return NextResponse.json({
    schema_version:        'bifrost-v1',
    generated_at:          new Date().toISOString(),
    member_id:             memberId,
    period:                month,
    requirement_met:       totalHours >= required,
    total_hours:           Math.round(totalHours    * 10) / 10,
    verified_hours:        Math.round(verifiedHours * 10) / 10,
    required_hours:        required,
    compliance_percentage: Math.round((totalHours / required) * 100),
    sessions:              signedSessions,
    evidence_summary:      evidenceSummary,
  })
}
