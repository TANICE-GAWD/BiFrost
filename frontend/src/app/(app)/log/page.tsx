'use client'
import { useState } from 'react'
import { Stack, Title, Text, Tabs, Alert, Loader, Group, Paper, Button, Box, Badge, Divider } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { Edit01Icon, CloudUploadIcon, CheckmarkCircle01Icon, File01Icon } from '@hugeicons/core-free-icons'
import LogForm from '@/components/LogForm/LogForm'
import UploadZone from '@/components/UploadZone/UploadZone'
import ExtractionReview from '@/components/ExtractionReview/ExtractionReview'
import { extractDocument } from '@/lib/api'
import type { ExtractionResult } from '@/lib/types'

type UploadState = 'idle' | 'extracting' | 'review' | 'done'

export default function LogPage() {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [extraction,  setExtraction]  = useState<ExtractionResult | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractError, setExtractError] = useState('')

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file); setExtractError(''); setUploadState('extracting')
    try {
      setExtraction(await extractDocument(file)); setUploadState('review')
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed'); setUploadState('idle')
    }
  }
  const reset = () => { setUploadState('idle'); setExtraction(null); setUploadedFile(null); setExtractError('') }

  const loadSample = async () => {
    setExtractError('')
    const res  = await fetch('/sample-paystub.pdf')
    const blob = await res.blob()
    const file = new File([blob], 'sample-paystub.pdf', { type: 'application/pdf' })
    handleFileSelect(file)
  }

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2} fw={800}>Log Hours</Title>
        <Text c="dimmed" size="sm">Record your work, education, or volunteer activity</Text>
      </Box>

      <Tabs defaultValue="upload" radius="md">
        <Tabs.List mb="lg">
          <Tabs.Tab value="manual" leftSection={<HugeiconsIcon icon={Edit01Icon} size={15} strokeWidth={1.5} />}>Manual Entry</Tabs.Tab>
          <Tabs.Tab value="upload" leftSection={<HugeiconsIcon icon={CloudUploadIcon} size={15} strokeWidth={1.5} />}>Upload Document</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="manual">
          <LogForm onSaved={() => {}} />
        </Tabs.Panel>

        <Tabs.Panel value="upload">
          {uploadState === 'idle' && (
            <Stack gap="md">
              {extractError && <Alert color="red" radius="md">{extractError}</Alert>}

              <Paper
                shadow="sm" p="lg" radius="lg"
                style={{ background: 'var(--mantine-color-teal-0)', border: '1.5px solid var(--mantine-color-teal-3)', cursor: 'pointer' }}
                onClick={loadSample}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <Group gap="md" wrap="nowrap">
                    <div style={{ background: 'var(--mantine-color-teal-6)', borderRadius: 10, padding: 10, display: 'flex', flexShrink: 0 }}>
                      <HugeiconsIcon icon={File01Icon} size={24} color="#fff" strokeWidth={1.5} />
                    </div>
                    <Box>
                      <Group gap="xs" mb={2}>
                        <Text fw={700} size="sm">Try it with a sample pay stub</Text>
                        <Badge color="teal" size="xs" variant="filled" radius="sm">DEMO</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">See the AI extract employer, dates, and hours automatically no upload needed</Text>
                    </Box>
                  </Group>
                  <Button size="xs" color="teal" variant="filled" style={{ flexShrink: 0 }} onClick={e => { e.stopPropagation(); loadSample() }}>
                    Run Demo →
                  </Button>
                </Group>
              </Paper>

              <Divider label="or upload your own" labelPosition="center" />

              <UploadZone onFileSelect={handleFileSelect} />
              <Text size="xs" c="dimmed" ta="center">Supported: PDF, PNG, JPEG · Max 10 MB · AI auto-extracts employer, dates, and hours</Text>
            </Stack>
          )}
          {uploadState === 'extracting' && (
            <Paper shadow="xs" p="xl" radius="lg" ta="center">
              <Loader color="teal" size="md" mb="md" />
              <Text fw={600}>Analyzing document…</Text>
              <Text size="sm" c="dimmed">{uploadedFile?.name}</Text>
            </Paper>
          )}
          {uploadState === 'review' && extraction && uploadedFile && (
            <ExtractionReview extraction={extraction} fileName={uploadedFile.name} file={uploadedFile} onConfirmed={() => setUploadState('done')} onCancel={reset} />
          )}
          {uploadState === 'done' && (
            <Paper shadow="xs" p="xl" radius="lg" ta="center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={48} color="#12b886" strokeWidth={1.5} />
              </div>
              <Text fw={700} size="lg">Hours logged successfully!</Text>
              <Text size="sm" c="dimmed" mb="lg">Your verified session has been added.</Text>
              <Button variant="outline" color="teal" onClick={reset}>Upload Another</Button>
            </Paper>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
