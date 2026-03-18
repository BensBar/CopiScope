import { useMemo } from 'react'
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import type { CopilotRecord } from '../types/metrics'

export function useFilteredRecords(): CopilotRecord[] {
  const records = useAppStore((s) => s.records)
  const filters = useAppStore((s) => s.filters)

  return useMemo(() => {
    let filtered = records

    if (filters.dateFrom) {
      const from = startOfDay(parseISO(filters.dateFrom))
      filtered = filtered.filter((r) => !isBefore(r.date, from))
    }
    if (filters.dateTo) {
      const to = endOfDay(parseISO(filters.dateTo))
      filtered = filtered.filter((r) => !isAfter(r.date, to))
    }
    if (filters.users.length > 0) {
      const set = new Set(filters.users)
      filtered = filtered.filter((r) => set.has(r.user))
    }
    if (filters.models.length > 0) {
      const modelSet = new Set(filters.models)
      filtered = filtered.filter((r) =>
        r.models.length === 0 || r.models.some((m) => modelSet.has(m.model_name))
      )
    }

    return filtered
  }, [records, filters])
}

export function useAllUsers(): string[] {
  const records = useAppStore((s) => s.records)
  return useMemo(() => Array.from(new Set(records.map((r) => r.user))).sort(), [records])
}

export function useAllModels(): string[] {
  const records = useAppStore((s) => s.records)
  return useMemo(() => {
    const models = new Set<string>()
    for (const r of records) {
      for (const m of r.models) models.add(m.model_name)
    }
    return Array.from(models).sort()
  }, [records])
}
