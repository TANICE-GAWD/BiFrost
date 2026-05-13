'use client'
import { useRef, useState } from 'react'
import { Box, Text, Alert, Stack } from '@mantine/core'
import { HugeiconsIcon } from '@hugeicons/react'
import { CloudUploadIcon } from '@hugeicons/core-free-icons'

interface Props { onFileSelect: (file: File) => void }
const ALLOWED = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

export default function UploadZone({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState('')

  const handleFile = (file: File) => {
    if (!ALLOWED.includes(file.type)) { setFileError('Only PNG, JPEG, or PDF files are supported'); return }
    if (file.size > MAX_SIZE) { setFileError('File must be under 10 MB'); return }
    setFileError(''); onFileSelect(file)
  }

  return (
    <Stack gap="sm">
      <Box
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          border: `2px dashed ${dragging ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-gray-3)'}`,
          borderRadius: 12,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--mantine-color-teal-0)' : 'var(--mantine-color-gray-0)',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <HugeiconsIcon icon={CloudUploadIcon} size={36} color={dragging ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-gray-5)'} strokeWidth={1.5} />
        </div>
        <Text fw={600} size="sm">Drop your document here</Text>
        <Text size="xs" c="dimmed">or click to browse</Text>
      </Box>
      {fileError && <Alert color="red" radius="md">{fileError}</Alert>}
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} style={{ display: 'none' }} />
    </Stack>
  )
}
