import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const goUrl = process.env.GO_BACKEND_URL ?? 'http://localhost:8080'

  const goFormData = new FormData()
  goFormData.append('file', file)

  let response: Response
  try {
    response = await fetch(`${goUrl}/extract`, {
      method: 'POST',
      body: goFormData,
    })
  } catch {
    return NextResponse.json(
      { error: 'Extraction service unavailable' },
      { status: 503 }
    )
  }

  const result = await response.json()

  if (!response.ok) {
    return NextResponse.json(result, { status: response.status })
  }

  return NextResponse.json(result)
}
