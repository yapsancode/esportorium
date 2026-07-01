export interface PrizeBreakdownItem {
  placement: string
  reward: string
}

export interface Tournament {
  id: string
  title: string
  status: string
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
