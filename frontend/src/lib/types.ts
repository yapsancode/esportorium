export interface Tournament {
  id: string
  title: string
  status: string
  format: string
  state: string | null
  venue: string | null
  start_date: string
  end_date: string
  registration_deadline: string
  prize_pool_rm: number
  additional_prizes: string[]
  max_teams: number
  organiser_name: string
  organiser_contact: string
  registration_link: string
  banner_image: string | null
}
