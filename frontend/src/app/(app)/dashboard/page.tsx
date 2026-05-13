'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { RingProgress, Paper, Group, Stack, Text, Title, Badge, SimpleGrid, Button, Skeleton, Divider, Box, ActionIcon } from '@mantine/core'
import { computeStats, type Session } from '@/lib/types'
import { HugeiconsIcon } from '@hugeicons/react'
import { Briefcase01Icon, Mortarboard01Icon, CharityIcon, CheckmarkCircle01Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons'
import EditSessionModal from '@/components/EditSessionModal/EditSessionModal'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

type PaceStatus = 'good' | 'warn' | 'done' | 'none'
function ordinalSuffix(n: number) {
  if (n >= 11 && n <= 13) return 'th'
  return ['th','st','nd','rd'][n % 10] ?? 'th'
}
function getPace(logged: number, required: number): { text: string; status: PaceStatus } {
  if (logged >= required) return { text: 'Goal reached this month!', status: 'done' }
  if (logged === 0)        return { text: 'Log hours to see your pace prediction', status: 'none' }
  const now = new Date(), day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - day
  const ratePerDay = logged / day
  const completionDay = Math.ceil(day + (required - logged) / ratePerDay)
  if (completionDay <= daysInMonth) {
    return { text: `At this rate, you'll hit your goal by the ${completionDay}${ordinalSuffix(completionDay)}`, status: 'good' }
  }
  return { text: `On pace for ~${(logged + ratePerDay * daysLeft).toFixed(0)} hrs by month end`, status: 'warn' }
}

const TYPE_CFG = {
  work:      { label: 'Work',      icon: Briefcase01Icon,  color: 'blue' },
  education: { label: 'Education', icon: Mortarboard01Icon, color: 'violet' },
  volunteer: { label: 'Volunteer', icon: CharityIcon,       color: 'orange' },
} as const

export default function DashboardPage() {
  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState<Session | null>(null)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      const { data } = await supabase.from('sessions').select('*')
        .order('activity_date', { ascending: false }).limit(200)
      setAllSessions(data ?? [])
      setLoading(false)
    }

    load()

    const channel = supabase.channel('dashboard-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const stats = computeStats(allSessions)
  const loggedPct   = Math.min(100, (stats.logged   / stats.required) * 100)
  const verifiedPct = Math.min(100, (stats.verified / stats.required) * 100)
  const pendingPct  = Math.max(0, loggedPct - verifiedPct)
  const pace        = getPace(stats.logged, stats.required)

  return (
    <Stack gap="lg">
      <EditSessionModal
        session={editing}
        onClose={() => setEditing(null)}
        onSaved={updated => { setAllSessions(prev => prev.map(s => s.id === updated.id ? updated : s)); setEditing(null) }}
        onDeleted={id => { setAllSessions(prev => prev.filter(s => s.id !== id)); setEditing(null) }}
      />
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2} fw={800}>Dashboard</Title>
          <Text c="dimmed" size="sm">{MONTHS[now.getMonth()]} {now.getFullYear()}</Text>
        </Box>
        <Button component={Link} href="/log" size="sm">+ Log Hours</Button>
      </Group>

      {/* Progress card */}
      <Paper shadow="xs" p="xl" radius="lg">
        <Text fw={700} size="lg" mb="lg">Monthly Progress</Text>
        <Group gap="xl" align="center" wrap="wrap">
          <RingProgress
            size={130} thickness={12} roundCaps
            sections={[
              { value: verifiedPct, color: 'teal.6' },
              { value: pendingPct,  color: 'teal.2' },
            ]}
            label={<Text ta="center" fw={800} fz={20}>{Math.round(loggedPct)}%</Text>}
          />
          <Stack gap={6}>
            <Group gap={4} align="baseline">
              <Text fz={38} fw={800} c="teal" lh={1}>{stats.logged.toFixed(1)}</Text>
              <Text c="dimmed" size="lg">/ {stats.required} hrs</Text>
            </Group>
            <Text size="sm" c="dimmed">
              {stats.logged < stats.required
                ? `${(stats.required - stats.logged).toFixed(1)} hrs to go`
                : 'Requirement met!'}
            </Text>
            <Badge
              variant="light"
              color={pace.status === 'good' ? 'teal' : pace.status === 'warn' ? 'yellow' : pace.status === 'done' ? 'teal' : 'gray'}
              size="sm" radius="sm" mt={2}
            >
              {pace.text}
            </Badge>
          </Stack>
        </Group>
        <Divider my="lg" />
        <Group gap="xl">
          <Group gap={6}>
            <Box w={10} h={10} style={{ borderRadius: '50%', background: 'var(--mantine-color-teal-6)' }} />
            <Text size="xs" c="dimmed">{stats.verified.toFixed(1)} hrs verified</Text>
          </Group>
          <Group gap={6}>
            <Box w={10} h={10} style={{ borderRadius: '50%', background: 'var(--mantine-color-teal-2)' }} />
            <Text size="xs" c="dimmed">{(stats.logged - stats.verified).toFixed(1)} hrs pending</Text>
          </Group>
          <Text size="xs" c="dimmed" ml="auto">{Math.round(loggedPct)}% complete</Text>
        </Group>
      </Paper>

      {/* By-type grid */}
      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
        {(['work', 'education', 'volunteer'] as const).map(type => {
          const { label, icon, color } = TYPE_CFG[type]
          const d = stats.byType[type]
          return (
            <Paper key={type} shadow="xs" p="lg" radius="lg" ta="center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <HugeiconsIcon icon={icon} size={28} strokeWidth={1.5} />
              </div>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }} mb={6}>{label}</Text>
              <Text fz={28} fw={800} c={color} lh={1}>
                {d.hours.toFixed(1)}<Text span size="sm" c="dimmed" fw={500}> hrs</Text>
              </Text>
              <Text size="xs" c="dimmed" mt={4}>{d.count} session{d.count !== 1 ? 's' : ''}</Text>
            </Paper>
          )
        })}
      </SimpleGrid>

      {/* Recent activity */}
      <Box>
        <Group justify="space-between" mb="sm">
          <Text fw={700} size="md">Recent Activity</Text>
          <Text component={Link} href="/report" size="sm" c="teal" fw={500}>View all →</Text>
        </Group>
        {loading ? (
          <Stack gap="sm">{[1,2,3].map(i => <Skeleton key={i} h={64} radius="lg" />)}</Stack>
        ) : allSessions.length === 0 ? (
          <Paper shadow="xs" p="xl" radius="lg" ta="center">
            <Text c="dimmed" size="sm">No sessions yet.{' '}
              <Text component={Link} href="/log" c="teal" span fw={500}>Log your first hours →</Text>
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            {allSessions.slice(0, 5).map(s => {
              const date = new Date(s.activity_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <Paper key={s.id} shadow="xs" p="md" radius="lg">
                  <Group justify="space-between" wrap="nowrap" style={{ overflow: 'hidden' }}>
                    <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <Text size="sm" c="dimmed" style={{ flexShrink: 0, width: 40 }}>{date}</Text>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate="end">{s.employer_org}</Text>
                        {s.description && <Text size="xs" c="dimmed" lineClamp={1}>{s.description}</Text>}
                      </Box>
                    </Group>
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0, paddingLeft: 8 }}>
                      <Text fw={700} size="sm">{Number(s.hours).toFixed(1)}h</Text>
                      <Badge variant="light" size="xs" color={TYPE_CFG[s.activity_type as keyof typeof TYPE_CFG]?.color ?? 'gray'}>{s.activity_type}</Badge>
                      {s.verified && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="var(--mantine-color-teal-6)" strokeWidth={1.5} />}
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
