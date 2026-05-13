import { NextRequest, NextResponse } from 'next/server'

const PROXY_URL = process.env.AI_VERCEL_PROXY_URL ?? 'https://ai-gateway.vercel.sh/v1/chat/completions'
const MODEL     = 'anthropic/claude-sonnet-4-5'

const SYSTEM_PROMPT = `You are a document parser for a Medicaid work-requirement compliance tracker.
Respond ONLY with valid JSON. No markdown fences, no explanation, no extra text.`

const USER_PROMPT = `Extract from this document and return exactly this JSON shape:
{
  "employer": "<organization or employer name, or null>",
  "start_date": "<YYYY-MM-DD or null>",
  "end_date": "<YYYY-MM-DD or null>",
  "hours": <total numeric hours as decimal, or null>,
  "notes": "<one sentence describing confidence and any caveats>"
}

Document rules:
- Pay stubs: use the "hours worked" field for the pay period shown.
- Employer letters: use the stated date range and total hours.
- Volunteer certificates: use the date of service and hours listed.
- School/training docs: set hours to null (enrollment verified separately).
- Dates must be YYYY-MM-DD. Hours must be a positive decimal or null.`

function stripFences(s: string): string {
  s = s.trim()
  const m = s.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  return m ? m[1].trim() : s
}

export async function POST(request: NextRequest) {
  const proxyKey = process.env.AI_VERCEL_PROXY_KEY
  if (!proxyKey) {
    return NextResponse.json({ error: 'AI extraction not configured' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf']
  const mimeType = file.type || 'image/jpeg'
  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json({ error: 'Unsupported file type — send PNG, JPEG, or PDF' }, { status: 400 })
  }

  const buffer  = await file.arrayBuffer()
  const base64  = Buffer.from(buffer).toString('base64')
  const dataURL = `data:${mimeType};base64,${base64}`

  const payload = {
    model:      MODEL,
    max_tokens: 512,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataURL } },
          { type: 'text',      text: USER_PROMPT },
        ],
      },
    ],
  }

  let gatewayRes: Response
  try {
    gatewayRes = await fetch(PROXY_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${proxyKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return NextResponse.json({ error: 'AI gateway unreachable' }, { status: 503 })
  }

  const rb = await gatewayRes.json()

  if (rb.error) {
    return NextResponse.json({ error: rb.error.message ?? 'Gateway error' }, { status: 502 })
  }

  const text = stripFences(rb.choices?.[0]?.message?.content ?? '')

  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({
      employer:   null,
      start_date: null,
      end_date:   null,
      hours:      null,
      notes:      'Could not parse structured data: ' + text,
    })
  }
}
