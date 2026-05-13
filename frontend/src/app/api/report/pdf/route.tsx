import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs: { name: string; value: string; options: CookieOptions }[]) {
          cs.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]) } catch {}
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 48, color: '#111827' },

  header: { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: '#0c8599', paddingBottom: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0c8599' },
  subtitle: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  metaRight: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase' },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 1 },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 18 },

  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  summaryNum: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0c8599' },
  summaryLbl: { fontSize: 8, color: '#6b7280', marginTop: 2 },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 8 },
  statusText: { fontSize: 9, fontFamily: 'Helvetica-Bold' },

  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: '6 8', borderRadius: 3, marginTop: 4 },
  tableRow: { flexDirection: 'row', padding: '7 8', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  colDate: { width: '12%' },
  colType: { width: '13%' },
  colEmployer: { width: '40%' },
  colHours: { width: '12%', textAlign: 'right' },
  colVerified: { width: '13%', textAlign: 'center' },
  colDesc: { width: '10%' },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', textTransform: 'uppercase' },
  tdText: { fontSize: 9, color: '#374151' },
  tdMuted: { fontSize: 8, color: '#9ca3af', marginTop: 1 },

  breakdown: { flexDirection: 'row', gap: 8, marginTop: 4 },
  breakdownItem: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9fafb', padding: '6 8', borderRadius: 4 },
  breakdownLabel: { fontSize: 9, color: '#6b7280' },
  breakdownValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },

  affidavit: { marginTop: 24, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, backgroundColor: '#fafafa' },
  affidavitTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151', marginBottom: 6 },
  affidavitText: { fontSize: 8.5, color: '#4b5563', lineHeight: 1.6 },

  signatureLine: { flexDirection: 'row', gap: 32, marginTop: 20 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#9ca3af', marginBottom: 3 },
  sigLabel: { fontSize: 8, color: '#9ca3af' },

  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  footerText: { fontSize: 7.5, color: '#9ca3af' },
})

const TYPE_LABELS: Record<string, string> = {
  work: 'Employment', education: 'Education', volunteer: 'Volunteer/Community Svc',
}

interface Session {
  id: string
  activity_date: string
  activity_type: string
  employer_org: string
  description: string | null
  hours: number
  verified: boolean
}

interface ReportData {
  memberEmail: string
  memberId: string
  month: string
  period: string
  sessions: Session[]
  totalHours: number
  verifiedHours: number
  byType: Record<string, { hours: number; count: number }>
}

function CEReport({ data }: { data: ReportData }) {
  const met = data.totalHours >= 80
  const pct = Math.min(100, Math.round((data.totalHours / 80) * 100))
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <Document title={`CE Activity Report — ${data.period}`} author="BiFrost">
      <Page size="LETTER" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Community Engagement Activity Report</Text>
              <Text style={styles.subtitle}>Medicaid Work Requirement — Monthly Verification Record</Text>
            </View>
            <View style={styles.metaRight}>
              <Text style={styles.metaLabel}>Report Period</Text>
              <Text style={styles.metaValue}>{data.period}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>Generated</Text>
              <Text style={styles.metaValue}>{generated}</Text>
            </View>
          </View>
        </View>

        {/* Member info */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 9, color: '#6b7280' }}>Member: </Text>
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{data.memberEmail}</Text>
          <Text style={{ fontSize: 9, color: '#6b7280', marginLeft: 16 }}>ID: </Text>
          <Text style={{ fontSize: 9 }}>{data.memberId.slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Summary cards */}
        <Text style={styles.sectionTitle}>Monthly Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{data.totalHours.toFixed(1)}</Text>
            <Text style={styles.summaryLbl}>Total Hours Logged</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{data.verifiedHours.toFixed(1)}</Text>
            <Text style={styles.summaryLbl}>Verified Hours</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>80.0</Text>
            <Text style={styles.summaryLbl}>Required Hours</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNum, { color: met ? '#059669' : '#d97706' }]}>{pct}%</Text>
            <Text style={styles.summaryLbl}>Requirement Met</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: met ? '#d1fae5' : '#fef3c7' }]}>
          <Text style={[styles.statusText, { color: met ? '#065f46' : '#92400e' }]}>
            {met
              ? `COMPLIANT — ${data.period} requirement satisfied`
              : `PENDING — ${(80 - data.totalHours).toFixed(1)} additional hours required`}
          </Text>
        </View>

        {/* Breakdown by type */}
        <Text style={styles.sectionTitle}>Hours by Activity Type</Text>
        <View style={styles.breakdown}>
          {(['work', 'education', 'volunteer'] as const).map(t => (
            <View key={t} style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>{TYPE_LABELS[t]}</Text>
              <Text style={styles.breakdownValue}>
                {(data.byType[t]?.hours ?? 0).toFixed(1)} hrs · {data.byType[t]?.count ?? 0} sessions
              </Text>
            </View>
          ))}
        </View>

        {/* Activity log */}
        <Text style={styles.sectionTitle}>Activity Log ({data.sessions.length} sessions)</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colDate]}>Date</Text>
          <Text style={[styles.thText, styles.colType]}>Type</Text>
          <Text style={[styles.thText, styles.colEmployer]}>Employer / Organization</Text>
          <Text style={[styles.thText, styles.colHours]}>Hours</Text>
          <Text style={[styles.thText, styles.colVerified]}>Verified</Text>
        </View>
        {data.sessions.map((s, i) => (
          <View key={s.id} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }]}>
            <Text style={[styles.tdText, styles.colDate]}>
              {new Date(s.activity_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={[styles.tdText, styles.colType]}>{TYPE_LABELS[s.activity_type] ?? s.activity_type}</Text>
            <View style={styles.colEmployer}>
              <Text style={styles.tdText}>{s.employer_org}</Text>
              {s.description && <Text style={styles.tdMuted}>{s.description}</Text>}
            </View>
            <Text style={[styles.tdText, styles.colHours]}>{Number(s.hours).toFixed(1)}</Text>
            <Text style={[styles.tdText, styles.colVerified, { color: s.verified ? '#059669' : '#9ca3af' }]}>
              {s.verified ? 'Verified ✓' : 'Self-reported'}
            </Text>
          </View>
        ))}

        {/* Affidavit */}
        <View style={styles.affidavit}>
          <Text style={styles.affidavitTitle}>MEMBER CERTIFICATION</Text>
          <Text style={styles.affidavitText}>
            I certify under penalty of perjury that the community engagement activities listed in this report are accurate and complete to the best of my knowledge. I understand that falsification of this record may result in termination of Medicaid benefits. All verified activities are supported by documentation on file (pay stubs, employer letters, volunteer certificates, or enrollment records) and available upon request by the state agency or managed care organization.
          </Text>
        </View>

        <View style={styles.signatureLine}>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { height: 24 }]} />
            <Text style={styles.sigLabel}>Member Signature</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { height: 24 }]} />
            <Text style={styles.sigLabel}>Date</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={[styles.sigLine, { height: 24 }]} />
            <Text style={styles.sigLabel}>Medicaid ID (if known)</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by BiFrost CE Hours Tracker · bifrost.health</Text>
          <Text style={styles.footerText}>
            {data.period} · {data.sessions.length} sessions · {data.totalHours.toFixed(1)} hrs logged
          </Text>
        </View>

      </Page>
    </Document>
  )
}

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawMonth = request.nextUrl.searchParams.get('month')
  const now      = new Date()
  const month    = rawMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month, use YYYY-MM' }, { status: 400 })
  }

  const [y, m] = month.split('-').map(Number)
  const start  = `${y}-${String(m).padStart(2, '0')}-01`
  const nm     = m === 12 ? 1 : m + 1
  const ny     = m === 12 ? y + 1 : y
  const end    = `${ny}-${String(nm).padStart(2, '0')}-01`
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const period = `${monthNames[m - 1]} ${y}`

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: sessions } = await supabaseAdmin
    .from('sessions')
    .select('id, activity_date, activity_type, employer_org, description, hours, verified')
    .eq('user_id', user.id)
    .gte('activity_date', start)
    .lt('activity_date', end)
    .order('activity_date', { ascending: true })

  const rows = sessions ?? []
  let totalHours = 0, verifiedHours = 0
  const byType: Record<string, { hours: number; count: number }> = {
    work: { hours: 0, count: 0 }, education: { hours: 0, count: 0 }, volunteer: { hours: 0, count: 0 },
  }
  for (const s of rows) {
    const h = Number(s.hours)
    totalHours += h
    if (s.verified) verifiedHours += h
    if (byType[s.activity_type]) { byType[s.activity_type].hours += h; byType[s.activity_type].count++ }
  }

  const reportData: ReportData = {
    memberEmail: user.email ?? 'Unknown',
    memberId:    user.id,
    month, period,
    sessions:     rows,
    totalHours:   Math.round(totalHours * 10) / 10,
    verifiedHours: Math.round(verifiedHours * 10) / 10,
    byType,
  }

  const buffer = await renderToBuffer(<CEReport data={reportData} />)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="CE_Report_${month}.pdf"`,
    },
  })
}
