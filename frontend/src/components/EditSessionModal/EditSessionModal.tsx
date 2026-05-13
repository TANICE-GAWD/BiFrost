'use client'
import { useState } from 'react'
import { Modal, Stack, Group, Select, TextInput, NumberInput, Textarea, Button, Alert, Text } from '@mantine/core'
import { createClient } from '@/lib/supabase'
import type { Session, ActivityType } from '@/lib/types'

interface Props {
  session: Session | null
  onClose: () => void
  onSaved: (updated: Session) => void
  onDeleted: (id: string) => void
}

const ACTIVITY_TYPES = [
  { value: 'work',      label: 'Work'      },
  { value: 'education', label: 'Education' },
  { value: 'volunteer', label: 'Volunteer' },
]

export default function EditSessionModal({ session, onClose, onSaved, onDeleted }: Props) {
  const [activityType, setActivityType] = useState<ActivityType>(session?.activity_type ?? 'work')
  const [employerOrg,  setEmployerOrg]  = useState(session?.employer_org ?? '')
  const [activityDate, setActivityDate] = useState(session?.activity_date ?? '')
  const [hours,        setHours]        = useState<number | ''>(session ? Number(session.hours) : '')
  const [description,  setDescription]  = useState(session?.description ?? '')
  const [loading,    setLoading]    = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [error,      setError]      = useState('')

  if (!session) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const h = typeof hours === 'number' ? hours : parseFloat(String(hours))
    if (isNaN(h) || h <= 0) { setError('Hours must be a positive number'); return }
    if (!employerOrg.trim()) { setError('Employer / organization is required'); return }
    setLoading(true)
    const { data, error: err } = await createClient().from('sessions')
      .update({ activity_type: activityType, employer_org: employerOrg.trim(), activity_date: activityDate, hours: h, description: description.trim() || null })
      .eq('id', session.id)
      .select()
      .single()
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved(data as Session)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error: err } = await createClient().from('sessions').delete().eq('id', session.id)
    setDeleting(false)
    if (err) { setError(err.message); return }
    onDeleted(session.id)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Modal opened={!!session} onClose={onClose} title="Edit Session" radius="lg" size="md" centered>
      <form onSubmit={handleSave}>
        <Stack gap="md">
          <Group grow>
            <Select label="Activity Type" data={ACTIVITY_TYPES} value={activityType} onChange={v => v && setActivityType(v as ActivityType)} />
            <TextInput label="Employer / Organization" value={employerOrg} onChange={e => setEmployerOrg(e.target.value)} required />
          </Group>
          <Group grow>
            <TextInput label="Date" type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} max={today} required />
            <NumberInput label="Hours" value={hours} onChange={v => setHours(v === '' ? '' : Number(v))} min={0.25} max={744} step={0.25} decimalScale={2} required />
          </Group>
          <Textarea label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description…" autosize minRows={2} maxRows={4} />
          {error && <Alert color="red" radius="md">{error}</Alert>}
          <Group justify="space-between" mt={4}>
            {confirmDel ? (
              <Group gap="xs">
                <Text size="sm" c="red">Delete this session?</Text>
                <Button size="xs" color="red" loading={deleting} onClick={handleDelete}>Yes, delete</Button>
                <Button size="xs" variant="default" onClick={() => setConfirmDel(false)}>Cancel</Button>
              </Group>
            ) : (
              <Button size="xs" color="red" variant="subtle" onClick={() => setConfirmDel(true)}>Delete</Button>
            )}
            <Group gap="sm">
              <Button variant="default" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={loading}>Save Changes</Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
