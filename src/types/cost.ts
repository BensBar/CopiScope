export interface CostConfig {
  pricePerSeat: number
  activeUserCount: number | null
  monthlyBudget: number | null
  forecastMonths: number
}

export interface CostProjection {
  currentMonthEstimate: number
  projectedAnnual: number
  budgetOverage: number | null
  costPerAcceptance: number
  costPerAcceptedLine: number
  monthlyTrend: Array<{ month: string; cost: number; budget?: number }>
}
