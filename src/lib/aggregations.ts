import { format, startOfWeek, startOfMonth, parseISO } from 'date-fns'
import type { CopilotRecord } from '../types/metrics'

export interface OverviewKPIs {
  totalSuggestions: number
  totalAcceptances: number
  acceptanceRate: number
  activeUsers: number
  totalLocAccepted: number
  totalChatInteractions: number
}

export interface UserAggregate {
  user: string
  suggestions: number
  acceptances: number
  acceptanceRate: number
  locAccepted: number
  chatInteractions: number
  lastActive: string
}

export interface ModelAggregate {
  model: string
  suggestions: number
  acceptances: number
  acceptanceRate: number
  locAccepted: number
}

export interface DailyPoint {
  date: string
  suggestions: number
  acceptances: number
  activeUsers: number
}

export interface WeeklyPoint {
  week: string
  activeUsers: number
  suggestions: number
  acceptances: number
}

export interface MonthlyPoint {
  month: string
  activeUsers: number
  suggestions: number
  acceptances: number
}

export interface AnomalyRecord {
  user: string
  date: string
  suggestions: number
  median: number
  mad: number
  zScore: number
  excess: number
  severity: 'low' | 'medium' | 'high'
}

export function computeOverviewKPIs(records: CopilotRecord[]): OverviewKPIs {
  const totalSuggestions = records.reduce((s, r) => s + r.suggestions, 0)
  const totalAcceptances = records.reduce((s, r) => s + r.acceptances, 0)
  const acceptanceRate = totalSuggestions > 0 ? (totalAcceptances / totalSuggestions) * 100 : 0
  const activeUsers = new Set(records.map((r) => r.user)).size
  const totalLocAccepted = records.reduce((s, r) => s + r.locAccepted, 0)
  const totalChatInteractions = records.reduce((s, r) => s + r.chatInteractions, 0)
  return { totalSuggestions, totalAcceptances, acceptanceRate, activeUsers, totalLocAccepted, totalChatInteractions }
}

export function groupByUser(records: CopilotRecord[]): UserAggregate[] {
  const map = new Map<string, UserAggregate>()
  for (const r of records) {
    const existing = map.get(r.user)
    if (!existing) {
      map.set(r.user, {
        user: r.user,
        suggestions: r.suggestions,
        acceptances: r.acceptances,
        acceptanceRate: 0,
        locAccepted: r.locAccepted,
        chatInteractions: r.chatInteractions,
        lastActive: r.dateKey,
      })
    } else {
      existing.suggestions += r.suggestions
      existing.acceptances += r.acceptances
      existing.locAccepted += r.locAccepted
      existing.chatInteractions += r.chatInteractions
      if (r.dateKey > existing.lastActive) existing.lastActive = r.dateKey
    }
  }
  return Array.from(map.values())
    .map((u) => ({ ...u, acceptanceRate: u.suggestions > 0 ? (u.acceptances / u.suggestions) * 100 : 0 }))
    .sort((a, b) => b.acceptances - a.acceptances)
}

export function groupByModel(records: CopilotRecord[]): ModelAggregate[] {
  const map = new Map<string, ModelAggregate>()
  for (const r of records) {
    for (const m of r.models) {
      const key = m.model_name
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          model: key,
          suggestions: m.code_generation_activity_count,
          acceptances: m.code_acceptance_activity_count,
          acceptanceRate: 0,
          locAccepted: m.loc_added_sum,
        })
      } else {
        existing.suggestions += m.code_generation_activity_count
        existing.acceptances += m.code_acceptance_activity_count
        existing.locAccepted += m.loc_added_sum
      }
    }
  }
  // fallback: if no model breakdown, use total under "All Models"
  if (map.size === 0 && records.length > 0) {
    const kpis = computeOverviewKPIs(records)
    map.set('All Models', {
      model: 'All Models',
      suggestions: kpis.totalSuggestions,
      acceptances: kpis.totalAcceptances,
      acceptanceRate: kpis.acceptanceRate,
      locAccepted: kpis.totalLocAccepted,
    })
  }
  return Array.from(map.values())
    .map((m) => ({ ...m, acceptanceRate: m.suggestions > 0 ? (m.acceptances / m.suggestions) * 100 : 0 }))
    .sort((a, b) => b.suggestions - a.suggestions)
}

export function buildDailyTrend(records: CopilotRecord[]): DailyPoint[] {
  const map = new Map<string, { suggestions: number; acceptances: number; users: Set<string> }>()
  for (const r of records) {
    const existing = map.get(r.dateKey)
    if (!existing) {
      map.set(r.dateKey, { suggestions: r.suggestions, acceptances: r.acceptances, users: new Set([r.user]) })
    } else {
      existing.suggestions += r.suggestions
      existing.acceptances += r.acceptances
      existing.users.add(r.user)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, suggestions: v.suggestions, acceptances: v.acceptances, activeUsers: v.users.size }))
}

export function buildWeeklyTrend(records: CopilotRecord[]): WeeklyPoint[] {
  const map = new Map<string, { suggestions: number; acceptances: number; users: Set<string> }>()
  for (const r of records) {
    const week = format(startOfWeek(r.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const existing = map.get(week)
    if (!existing) {
      map.set(week, { suggestions: r.suggestions, acceptances: r.acceptances, users: new Set([r.user]) })
    } else {
      existing.suggestions += r.suggestions
      existing.acceptances += r.acceptances
      existing.users.add(r.user)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, activeUsers: v.users.size, suggestions: v.suggestions, acceptances: v.acceptances }))
}

export function buildMonthlyTrend(records: CopilotRecord[]): MonthlyPoint[] {
  const map = new Map<string, { suggestions: number; acceptances: number; users: Set<string> }>()
  for (const r of records) {
    const month = format(startOfMonth(r.date), 'yyyy-MM')
    const existing = map.get(month)
    if (!existing) {
      map.set(month, { suggestions: r.suggestions, acceptances: r.acceptances, users: new Set([r.user]) })
    } else {
      existing.suggestions += r.suggestions
      existing.acceptances += r.acceptances
      existing.users.add(r.user)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, activeUsers: v.users.size, suggestions: v.suggestions, acceptances: v.acceptances }))
}

export function getUsageDistribution(records: CopilotRecord[]): Array<{ bucket: string; count: number }> {
  const userMap = groupByUser(records)
  const buckets = [
    { label: 'Inactive (0)', min: 0, max: 0 },
    { label: '1–10', min: 1, max: 10 },
    { label: '11–50', min: 11, max: 50 },
    { label: '51–200', min: 51, max: 200 },
    { label: '200+', min: 201, max: Infinity },
  ]
  return buckets.map((b) => ({
    bucket: b.label,
    count: userMap.filter((u) => u.acceptances >= b.min && u.acceptances <= b.max).length,
  }))
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mad(arr: number[], med: number): number {
  if (arr.length === 0) return 0
  const deviations = arr.map((v) => Math.abs(v - med))
  return median(deviations)
}

export function detectAnomalies(records: CopilotRecord[], threshold = 3.5): AnomalyRecord[] {
  // Group daily suggestions per user
  const userDays = new Map<string, Map<string, number>>()
  for (const r of records) {
    if (!userDays.has(r.user)) userDays.set(r.user, new Map())
    const dayMap = userDays.get(r.user)!
    dayMap.set(r.dateKey, (dayMap.get(r.dateKey) || 0) + r.suggestions)
  }

  const anomalies: AnomalyRecord[] = []

  for (const [user, dayMap] of userDays) {
    const values = Array.from(dayMap.values())
    if (values.length < 3) continue
    const med = median(values)
    const madVal = mad(values, med)
    if (madVal === 0) continue

    for (const [date, val] of dayMap) {
      const z = (0.6745 * (val - med)) / madVal
      if (z > threshold) {
        const excess = val - med
        const severity: AnomalyRecord['severity'] = z > threshold * 1.5 ? 'high' : z > threshold * 1.2 ? 'medium' : 'low'
        anomalies.push({ user, date, suggestions: val, median: med, mad: madVal, zScore: z, excess, severity })
      }
    }
  }

  return anomalies.sort((a, b) => b.zScore - a.zScore)
}

export function getActiveInactiveUsers(
  allUsers: string[],
  records: CopilotRecord[]
): { active: string[]; inactive: string[] } {
  const activeSet = new Set(records.filter((r) => r.suggestions > 0).map((r) => r.user))
  const active = allUsers.filter((u) => activeSet.has(u))
  const inactive = allUsers.filter((u) => !activeSet.has(u))
  return { active, inactive }
}

// ---------- Drill-down helpers ----------

export function getUserDailyTrend(records: CopilotRecord[], user: string): DailyPoint[] {
  return buildDailyTrend(records.filter((r) => r.user === user))
}

export function getModelDailyTrend(records: CopilotRecord[], modelName: string): DailyPoint[] {
  const map = new Map<string, { suggestions: number; acceptances: number; users: Set<string> }>()
  for (const r of records) {
    const m = r.models.find((mm) => mm.model_name === modelName)
    if (!m) continue
    const existing = map.get(r.dateKey)
    if (!existing) {
      map.set(r.dateKey, {
        suggestions: m.code_generation_activity_count,
        acceptances: m.code_acceptance_activity_count,
        users: new Set([r.user]),
      })
    } else {
      existing.suggestions += m.code_generation_activity_count
      existing.acceptances += m.code_acceptance_activity_count
      existing.users.add(r.user)
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, suggestions: v.suggestions, acceptances: v.acceptances, activeUsers: v.users.size }))
}

export function getDayUserBreakdown(records: CopilotRecord[], dateKey: string): UserAggregate[] {
  return groupByUser(records.filter((r) => r.dateKey === dateKey))
}

export function getWeekUserBreakdown(records: CopilotRecord[], weekStart: string): UserAggregate[] {
  const weekRecords = records.filter((r) => {
    const ws = format(startOfWeek(r.date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    return ws === weekStart
  })
  return groupByUser(weekRecords)
}

export function getBucketUsers(records: CopilotRecord[], minAcc: number, maxAcc: number): UserAggregate[] {
  return groupByUser(records).filter((u) => u.acceptances >= minAcc && u.acceptances <= maxAcc)
}

export function computeMonthlyBuckets(
  records: CopilotRecord[],
  pricePerSeat: number,
  activeSeatCount: number,
  budget: number | null,
  forecastMonths: number
): Array<{ month: string; cost: number; budget?: number }> {
  const monthly = buildMonthlyTrend(records)
  const result: Array<{ month: string; cost: number; budget?: number }> = monthly.map((m) => ({
    month: format(parseISO(m.month + '-01'), 'MMM yyyy'),
    cost: activeSeatCount * pricePerSeat,
    ...(budget != null ? { budget } : {}),
  }))

  // Add forecast months
  if (monthly.length > 0) {
    const lastMonthStr = monthly[monthly.length - 1].month
    let lastDate = parseISO(lastMonthStr + '-01')
    for (let i = 1; i <= forecastMonths; i++) {
      lastDate = startOfMonth(new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1))
      result.push({
        month: format(lastDate, 'MMM yyyy') + ' (proj.)',
        cost: activeSeatCount * pricePerSeat,
        ...(budget != null ? { budget } : {}),
      })
    }
  }

  return result
}
