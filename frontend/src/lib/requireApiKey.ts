import { NextRequest, NextResponse } from 'next/server'

export function requireApiKey(request: NextRequest): Response | null {
  const key = request.headers.get('x-api-key')
  if (!key || key !== process.env.COMPLIANCE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
