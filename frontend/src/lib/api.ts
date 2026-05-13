import type { ExtractionResult } from './types'

export async function extractDocument(file: File): Promise<ExtractionResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/extract', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Extraction failed')
  }

  return res.json()
}
