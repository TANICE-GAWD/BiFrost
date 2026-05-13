'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Stack, Select, TextInput, NumberInput, Textarea, Button, Alert, Badge, Group, Paper, Text, Box } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { Robot01Icon } from '@hugeicons/core-free-icons'
import type { ExtractionResult, ActivityType } from '@/lib/types'

interface Props {
  extraction: ExtractionResult
  fileName: string
  file: File
  onConfirmed: () => void
  onCancel: () => void
}

const ACTIVITY_TYPES = [
  { value: 'work',      label: 'Work'      },
  { value: 'education', label: 'Education' },
  { value: 'volunteer', label: 'Volunteer' },
]

export default function ExtractionReview({ extraction, fileName, file, onConfirmed, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [activityType, setActivityType] = useState<ActivityType>('work')
  const [employerOrg,  setEmployerOrg]  = useState(extraction.employer ?? '')
  const [activityDate, setActivityDate] = useState(extraction.start_date ?? today)
  const [hours,        setHours]        = useState<number | ''>(extraction.hours ?? '')
  const [description,  setDescription]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    const h = typeof hours === 'number' ? hours : parseFloat(String(hours))
    if (isNaN(h) || h <= 0) { setError('Hours must be a positive number'); return }
    if (!employerOrg.trim()) { setError('Employer / organization is required'); return }
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    const ext = file.name.split('.').pop() ?? 'pdf'
    const storagePath = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(storagePath, file, { contentType: file.type })
    if (uploadErr) { setError('Failed to upload: ' + uploadErr.message); setLoading(false); return }

    const { data: doc, error: docErr } = await supabase.from('documents').insert({
      user_id: user.id, storage_path: storagePath, original_name: file.name, status: 'confirmed',
      extracted_employer: extraction.employer, extracted_start: extraction.start_date,
      extracted_end: extraction.end_date, extracted_hours: extraction.hours, extraction_notes: extraction.notes,
    }).select().single()
    if (docErr) { setError('Failed to save document: ' + docErr.message); setLoading(false); return }

    const { error: sessErr } = await supabase.from('sessions').insert({
      user_id: user.id, activity_type: activityType, employer_org: employerOrg.trim(),
      activity_date: activityDate, hours: h, description: description.trim() || null,
      verified: true, document_id: doc.id,
    })
    if (sessErr) { setError('Failed to save session: ' + sessErr.message); setLoading(false); return }
    onConfirmed()
  }

  return (
    <Stack gap="md">
      <Group gap="sm">
        <Badge variant="light" color="teal" size="lg" leftSection={<HugeiconsIcon icon={Robot01Icon} size={13} strokeWidth={1.5} />}>AI Extracted</Badge>
        <Text size="sm" c="dimmed">{fileName}</Text>
      </Group>
      {extraction.notes && (
        <Alert color="teal" variant="light" radius="md">{extraction.notes}</Alert>
      )}
      <Paper shadow="xs" p="xl" radius="lg" maw={640}>
        <Text fw={700} mb="lg">Review & confirm extracted data</Text>
        <form onSubmit={handleConfirm}>
          <Stack gap="md">
            <Group grow>
              <Select label="Activity Type" data={ACTIVITY_TYPES} value={activityType} onChange={v => v && setActivityType(v as ActivityType)} />
              <TextInput label="Employer / Organization" value={employerOrg} onChange={e => setEmployerOrg(e.target.value)} required />
            </Group>
            <Group grow>
              <TextInput label="Date" type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} required />
              <NumberInput label="Hours" value={hours} onChange={v => setHours(v === '' ? '' : Number(v))} min={0.25} max={744} step={0.25} decimalScale={2} required />
              {extraction.end_date && (
                <TextInput label="End Date (from doc)" type="date" value={extraction.end_date} readOnly styles={{ input: { background: 'var(--mantine-color-gray-1)', cursor: 'default' } }} />
              )}
            </Group>
            <Textarea label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional notes…" autosize minRows={2} maxRows={4} />
            {error && <Alert color="red" radius="md">{error}</Alert>}
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={onCancel}>Cancel</Button>
              <Button type="submit" loading={loading}>Confirm & Log Hours</Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
