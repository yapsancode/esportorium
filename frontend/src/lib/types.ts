export interface PrizeBreakdownItem {
  placement: string
  reward: string
}

export interface Tournament {
  id: string
  title: string
  status: string
  is_approved: boolean
  format: 'online' | 'offline' | 'hybrid' | null
  state: string | null
  venue: string | null
  stage_notes: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  registration_deadline: string | null
  prize_pool_rm: number | null
  additional_prizes: string[]
  prize_breakdown: PrizeBreakdownItem[]
  max_teams: number | null
  organiser_name: string | null
  organiser_contact: string | null
  registration_link: string | null
  banner_image: string | null
}

// Draft returned by the agentic ingest endpoint. Null fields are low-confidence
// and appear in flagged_fields for the UI to highlight for human completion.
export interface IngestDraft {
  title: string | null
  format: 'online' | 'offline' | 'hybrid' | null
  state: string | null
  venue: string | null
  start_date: string | null
  end_date: string | null
  registration_deadline: string | null
  prize_pool_rm: number | null
  max_teams: number | null
  registration_link: string | null
}

export interface IngestDraftOut {
  draft: IngestDraft
  flagged_fields: string[]
  extracted_count: number
  total_fields: number
  model_used: 'primary' | 'fallback'
  fallback_reason: 'quality' | 'reliability' | null
}
