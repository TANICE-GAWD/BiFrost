export type ActivityType = 'work' | 'education' | 'volunteer'
export type DocStatus = 'pending' | 'extracted' | 'confirmed' | 'failed'

export interface Session {
  id: string
  user_id: string
  activity_type: ActivityType
  employer_org: string
  description: string | null
  activity_date: string
  hours: number
  verified: boolean
  document_id: string | null
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  storage_path: string
  original_name: string
  status: DocStatus
  extracted_employer: string | null
  extracted_start: string | null
  extracted_end: string | null
  extracted_hours: number | null
  extraction_notes: string | null
  created_at: string
}

export interface ExtractionResult {
  employer: string | null
  start_date: string | null
  end_date: string | null
  hours: number | null
  notes: string
}

export interface MonthlyStats {
  required: number
  logged: number
  verified: number
  byType: Record<ActivityType, { hours: number; count: number }>
}

export function computeStats(sessions: Session[]): MonthlyStats {
  const byType: MonthlyStats['byType'] = {
    work:      { hours: 0, count: 0 },
    education: { hours: 0, count: 0 },
    volunteer: { hours: 0, count: 0 },
  }
  let logged = 0
  let verified = 0

  for (const s of sessions) {
    const h = Number(s.hours)
    logged += h
    if (s.verified) verified += h
    byType[s.activity_type].hours += h
    byType[s.activity_type].count += 1
  }

  return { required: 80, logged, verified, byType }
}
