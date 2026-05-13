'use client'
import { useState } from 'react'
import { Stack, Title, Text, Tabs, Alert, Loader, Group, Paper, Button, Box } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { Edit01Icon, CloudUploadIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
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

  return (
    <Stack gap="lg">
      <Box>
        <Title order={2} fw={800}>Log Hours</Title>
        <Text c="dimmed" size="sm">Record your work, education, or volunteer activity</Text>
      </Box>

      <Tabs defaultValue="manual" radius="md">
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
