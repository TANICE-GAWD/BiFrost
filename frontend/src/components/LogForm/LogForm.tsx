'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Stack, Select, TextInput, NumberInput, Textarea, Button, Alert, Badge, Group, Paper, SimpleGrid } from '@mantine/core'
import type { ActivityType } from '@/lib/types'

interface Props {
  onSaved: () => void
  defaults?: { activityType?: ActivityType; employerOrg?: string; activityDate?: string; hours?: number; description?: string }
  verified?: boolean
  documentId?: string
}

const ACTIVITY_TYPES = [
  { value: 'work',      label: 'Work'      },
  { value: 'education', label: 'Education' },
  { value: 'volunteer', label: 'Volunteer' },
]

export default function LogForm({ onSaved, defaults = {}, verified = false, documentId }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [activityType, setActivityType] = useState<ActivityType>(defaults.activityType ?? 'work')
  const [employerOrg,  setEmployerOrg]  = useState(defaults.employerOrg  ?? '')
  const [activityDate, setActivityDate] = useState(defaults.activityDate ?? today)
  const [hours,        setHours]        = useState<number | ''>(defaults.hours ?? '')
  const [description,  setDescription]  = useState(defaults.description  ?? '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const h = typeof hours === 'number' ? hours : parseFloat(String(hours))
    if (isNaN(h) || h <= 0) { setError('Hours must be a positive number'); return }
    if (!employerOrg.trim()) { setError('Employer / organization is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }
    const { error: dbErr } = await supabase.from('sessions').insert({
      user_id: user.id, activity_type: activityType, employer_org: employerOrg.trim(),
      activity_date: activityDate, hours: h, description: description.trim() || null,
      verified, document_id: documentId ?? null,
    })
    if (dbErr) { setError(dbErr.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
    setTimeout(() => { setSuccess(false); onSaved() }, 1200)
  }

  return (
    <Paper shadow="xs" p="xl" radius="lg" maw={640}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <Select label="Activity Type" data={ACTIVITY_TYPES} value={activityType} onChange={v => v && setActivityType(v as ActivityType)} />
            <TextInput label="Employer / Organization" value={employerOrg} onChange={e => setEmployerOrg(e.target.value)} placeholder="e.g. Walgreens, Food Bank" required />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput label="Date" type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} max={today} required />
            <NumberInput label="Hours" value={hours} onChange={v => setHours(v === '' ? '' : Number(v))} placeholder="e.g. 4" min={0.25} max={24} step={0.25} decimalScale={2} required />
          </SimpleGrid>
          <Textarea label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" rows={3} autosize minRows={2} maxRows={5} />
          {error   && <Alert color="red"  radius="md">{error}</Alert>}
          {success && <Alert color="teal" radius="md">Session saved!</Alert>}
          <Group justify="space-between">
            {verified && <Badge variant="light" color="teal">Will be marked verified</Badge>}
            <Button type="submit" loading={loading} disabled={success} ml="auto">Log Hours</Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  )
}
