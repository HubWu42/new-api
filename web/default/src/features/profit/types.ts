export type ProfitRow = {
  key: string
  revenue: number
  cost: number
  profit: number
  profit_rate: number
  request_count: number
  prompt_tokens: number
  comp_tokens: number
  untracked: number
}

export type ProfitDashboard = {
  total_revenue: number
  total_cost: number
  total_profit: number
  profit_rate: number
  top_profit_models: ProfitRow[]
  top_cost_channels: ProfitRow[]
  daily_trend: ProfitRow[]
  low_profit_alerts: ProfitRow[]
}
