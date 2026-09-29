export type Profile = {
  id: string
  username: string
  balance: number
  last_bonus_at: string | null
  created_at: string
}

export type GameStatus = 'open' | 'locked' | 'finished' | 'cancelled'

export type Option = {
  id: string
  market_id: string
  label: string
  odd: number
  position: number
  is_winner: boolean | null
}

export type Market = {
  id: string
  game_id: string
  title: string
  is_main: boolean
  position: number
  status: 'open' | 'settled' | 'void'
  options: Option[]
}

export type Game = {
  id: string
  creator_id: string
  home_team: string
  away_team: string
  description: string | null
  location: string | null
  starts_at: string | null
  status: GameStatus
  home_score: number | null
  away_score: number | null
  created_at: string
  creator?: { username: string } | null
  markets?: Market[]
  bets?: { stake: number }[]
}

export type BetStatus = 'pending' | 'won' | 'lost' | 'void'

export type Bet = {
  id: string
  user_id: string
  game_id: string
  market_id: string
  option_id: string
  stake: number
  odd: number
  status: BetStatus
  payout: number
  created_at: string
  profile?: { username: string } | null
  option?: { label: string } | null
  market?: { title: string } | null
  game?: Pick<Game, 'id' | 'home_team' | 'away_team' | 'status'> | null
}

export type Comment = {
  id: string
  game_id: string
  user_id: string
  content: string
  created_at: string
  profile?: { username: string } | null
}
