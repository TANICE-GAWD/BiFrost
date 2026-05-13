'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Stack, Title, Text, Group, Button, Paper, Select, SimpleGrid, Badge, Skeleton, Box, ActionIcon } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { Download01Icon, CheckmarkCircle01Icon, PencilEdit01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import { computeStats, type Session } from '@/lib/types'
import EditSessionModal from '@/components/EditSessionModal/EditSessionModal'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TYPE_COLOR = { work: 'blue', education: 'violet', volunteer: 'orange' } as const

export default function ReportPage() {
  const now = new Date()
  const [year, setYear] = useState(String(now.getFullYear()))
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Session | null>(null)

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nm = Number(month) === 12 ? 1 : Number(month) + 1
  const ny = Number(month) === 12 ? Number(year) + 1 : Number(year)
  const monthEnd = `${ny}-${String(nm).padStart(2, '0')}-01`

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('sessions').select('*')
        .gte('activity_date', monthStart).lt('activity_date', monthEnd)
        .order('activity_date', { ascending: false })
      setSessions(data ?? [])
      setLoading(false)
    }

    load()

    const channel = supabase.channel('report-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [monthStart, monthEnd])

  const stats = computeStats(sessions)

  const exportCSV = () => {
    const rows = sessions.map(s => [s.activity_date, s.activity_type, `"${s.employer_org.replace(/"/g,'""')}"`, s.hours, `"${(s.description??'').replace(/"/g,'""')}"`, s.verified?'Yes':'No'].join(','))
    const blob = new Blob(['Date,Type,Employer,Hours,Description,Verified\n' + rows.join('\n')], { type: 'text/csv' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ce_${year}_${month.padStart(2,'0')}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  const yearOptions = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i))
  const monthOptions = MONTH_NAMES.map((name, i) => ({ value: String(i + 1), label: name }))
  const pct = Math.min(100, Math.round((stats.logged / 80) * 100))

  return (
    <Stack gap="lg">
      <EditSessionModal
        session={editing}
        onClose={() => setEditing(null)}
        onSaved={updated => { setSessions(prev => prev.map(s => s.id === updated.id ? updated : s)); setEditing(null) }}
        onDeleted={id => { setSessions(prev => prev.filter(s => s.id !== id)); setEditing(null) }}
      />
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2} fw={800}>Monthly Report</Title>
          <Text c="dimmed" size="sm">Export for your state agency or health plan</Text>
        </Box>
        <Button onClick={exportCSV} disabled={sessions.length === 0} size="sm" leftSection={<HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={1.5} />}>Export CSV</Button>
      </Group>

      <Paper shadow="xs" p="lg" radius="lg">
        <Text fw={600} size="sm" mb="sm">Select Period</Text>
        <Group gap="sm">
          <Select data={monthOptions} value={month} onChange={v => v && setMonth(v)} w={160} size="sm" radius="md" />
          <Select data={yearOptions} value={year} onChange={v => v && setYear(v)} w={100} size="sm" radius="md" />
        </Group>
      </Paper>

      <SimpleGrid cols={4} spacing="md">
        {[
          { label: 'Total Hours',    value: stats.logged.toFixed(1),  color: 'teal'   },
          { label: 'Verified Hours', value: stats.verified.toFixed(1), color: 'teal'  },
          { label: 'Requirement',    value: `${pct}%`, color: pct >= 100 ? 'teal' : 'yellow' },
          { label: 'Sessions',       value: String(sessions.length),  color: 'blue'   },
        ].map(({ label, value, color }) => (
          <Paper key={label} shadow="xs" p="lg" radius="lg" ta="center">
            <Text fz={28} fw={800} c={color} lh={1}>{value}</Text>
            <Text size="xs" c="dimmed" mt={4}>{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper shadow="xs" p="lg" radius="lg">
        <Text fw={700} mb="md">Breakdown by Type</Text>
        <Stack gap="sm">
          {(['work', 'education', 'volunteer'] as const).map(type => {
            const d = stats.byType[type]
            const tPct = stats.logged > 0 ? Math.round((d.hours / stats.logged) * 100) : 0
            return (
              <Group key={type} justify="space-between">
                <Group gap="sm">
                  <Badge variant="light" color={TYPE_COLOR[type]} size="sm">{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
                  <Text size="sm" c="dimmed">{d.count} sessions</Text>
                </Group>
                <Group gap="sm">
                  <Text fw={600} size="sm">{d.hours.toFixed(1)} hrs</Text>
                  <Text size="sm" c="dimmed" w={36} ta="right">{tPct}%</Text>
                </Group>
              </Group>
            )
          })}
        </Stack>
      </Paper>

      <Box>
        <Text fw={700} mb="sm">All Sessions</Text>
        {loading ? (
          <Stack gap="sm">{[1,2,3].map(i => <Skeleton key={i} h={64} radius="lg" />)}</Stack>
        ) : sessions.length === 0 ? (
          <Paper shadow="xs" p="xl" radius="lg" ta="center">
            <Text c="dimmed" size="sm">No sessions found for this period.</Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {sessions.map(s => {
              const date = new Date(s.activity_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <Paper key={s.id} shadow="xs" p="md" radius="lg">
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                      <Text size="sm" c="dimmed" w={44} style={{ flexShrink: 0 }}>{date}</Text>
                      <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.employer_org}</Text>
                        {s.description && <Text size="xs" c="dimmed" lineClamp={1}>{s.description}</Text>}
                      </Box>
                    </Group>
                    <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Text fw={700} size="sm">{Number(s.hours).toFixed(1)}h</Text>
                      <Badge variant="light" size="xs" color={TYPE_COLOR[s.activity_type as keyof typeof TYPE_COLOR] ?? 'gray'}>{s.activity_type}</Badge>
                      {s.verified && <Badge variant="light" size="xs" color="teal" leftSection={<HugeiconsIcon icon={CheckmarkCircle01Icon} size={10} strokeWidth={1.5} />}>Verified</Badge>}
                      <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setEditing(s)}>
                        <HugeiconsIcon icon={PencilEdit01Icon} size={14} strokeWidth={1.5} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
