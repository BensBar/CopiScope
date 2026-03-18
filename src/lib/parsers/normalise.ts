import { parseISO, isValid, format } from 'date-fns'
import type { CopilotRecord, RawNDJSONRow, RawCSVRow, ModelFeatureTotals, IdeTotals } from '../../types/metrics'

function parseDate(s: string): Date | null {
  if (!s) return null
  const d = parseISO(s)
  return isValid(d) ? d : null
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }
  return 0
}

function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return false
}

/**
 * Extract model data from the nested Copilot Metrics API v2 format:
 * copilot_ide_code_completions.editors[].models[]
 * or copilot_ide_code_completions.models[]
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractModelsFromNested(row: any): ModelFeatureTotals[] {
  const models: ModelFeatureTotals[] = []
  const seen = new Map<string, ModelFeatureTotals>()

  // Try copilot_ide_code_completions.editors[].models[]
  const completions = row.copilot_ide_code_completions
  if (completions && typeof completions === 'object') {
    const editors = completions.editors || completions.editor || []
    if (Array.isArray(editors)) {
      for (const editor of editors) {
        const editorModels = editor.models || []
        for (const m of editorModels) {
          const name = m.name || m.model_name || 'unknown'
          // Models may have per-language breakdowns, aggregate them
          let totalSugg = 0, totalAcc = 0, totalLocSugg = 0, totalLocAcc = 0
          if (Array.isArray(m.languages)) {
            for (const lang of m.languages) {
              totalSugg += num(lang.total_code_suggestions || lang.code_generation_activity_count)
              totalAcc += num(lang.total_code_acceptances || lang.code_acceptance_activity_count)
              totalLocSugg += num(lang.total_code_lines_suggested || lang.loc_suggested_to_add_sum)
              totalLocAcc += num(lang.total_code_lines_accepted || lang.loc_added_sum)
            }
          } else {
            totalSugg = num(m.total_code_suggestions || m.code_generation_activity_count || m.total_engaged_users)
            totalAcc = num(m.total_code_acceptances || m.code_acceptance_activity_count)
            totalLocSugg = num(m.total_code_lines_suggested || m.loc_suggested_to_add_sum)
            totalLocAcc = num(m.total_code_lines_accepted || m.loc_added_sum)
          }
          const existing = seen.get(name)
          if (existing) {
            existing.code_generation_activity_count += totalSugg
            existing.code_acceptance_activity_count += totalAcc
            existing.loc_suggested_to_add_sum += totalLocSugg
            existing.loc_added_sum += totalLocAcc
          } else {
            const entry: ModelFeatureTotals = {
              model_name: name,
              feature: 'code_completion',
              code_generation_activity_count: totalSugg,
              code_acceptance_activity_count: totalAcc,
              loc_suggested_to_add_sum: totalLocSugg,
              loc_added_sum: totalLocAcc,
            }
            seen.set(name, entry)
            models.push(entry)
          }
        }
      }
    }
  }

  return models
}

/**
 * Extract IDE data from nested Copilot API format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractIdesFromNested(row: any): IdeTotals[] {
  const ides: IdeTotals[] = []
  const completions = row.copilot_ide_code_completions
  if (completions && typeof completions === 'object') {
    const editors = completions.editors || completions.editor || []
    if (Array.isArray(editors)) {
      for (const editor of editors) {
        let totalSugg = 0, totalAcc = 0
        const models = editor.models || []
        for (const m of models) {
          if (Array.isArray(m.languages)) {
            for (const lang of m.languages) {
              totalSugg += num(lang.total_code_suggestions || lang.code_generation_activity_count)
              totalAcc += num(lang.total_code_acceptances || lang.code_acceptance_activity_count)
            }
          } else {
            totalSugg += num(m.total_code_suggestions || m.code_generation_activity_count)
            totalAcc += num(m.total_code_acceptances || m.code_acceptance_activity_count)
          }
        }
        ides.push({
          ide_name: editor.name || editor.ide_name || 'Unknown',
          code_generation_activity_count: totalSugg,
          code_acceptance_activity_count: totalAcc,
        })
      }
    }
  }
  return ides
}

export function normaliseNDJSON(rows: RawNDJSONRow[]): { records: CopilotRecord[]; warnings: string[] } {
  const records: CopilotRecord[] = []
  const warnings: string[] = []

  for (const row of rows) {
    const date = parseDate(row.day)
    if (!date) {
      warnings.push(`Invalid date "${row.day}", skipped`)
      continue
    }

    const user = row.user_login || (row.user_id ? `user_${row.user_id}` : 'unknown')

    // Extract model data — try flat format first, then nested API v2 format
    let rawModels = row.totals_by_model_feature || []
    if (rawModels.length === 0) {
      rawModels = extractModelsFromNested(row)
    }

    // Remap field names (model→model_name) and consolidate same-model entries across features
    const modelMap = new Map<string, ModelFeatureTotals>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const raw of rawModels as any[]) {
      const name = raw.model_name || raw.model || 'unknown'
      const existing = modelMap.get(name)
      if (existing) {
        existing.code_generation_activity_count += num(raw.code_generation_activity_count)
        existing.code_acceptance_activity_count += num(raw.code_acceptance_activity_count)
        existing.loc_suggested_to_add_sum += num(raw.loc_suggested_to_add_sum)
        existing.loc_added_sum += num(raw.loc_added_sum)
      } else {
        modelMap.set(name, {
          model_name: name,
          feature: raw.feature || 'code_completion',
          code_generation_activity_count: num(raw.code_generation_activity_count),
          code_acceptance_activity_count: num(raw.code_acceptance_activity_count),
          loc_suggested_to_add_sum: num(raw.loc_suggested_to_add_sum),
          loc_added_sum: num(raw.loc_added_sum),
        })
      }
    }
    const models = Array.from(modelMap.values())

    // Extract IDE data — try flat format first, then nested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ides: IdeTotals[] = (row.totals_by_ide || []).map((i: any) => ({
      ide_name: i.ide_name || i.ide || i.name || 'Unknown',
      code_generation_activity_count: num(i.code_generation_activity_count),
      code_acceptance_activity_count: num(i.code_acceptance_activity_count),
    }))
    if (ides.length === 0) {
      ides = extractIdesFromNested(row)
    }
    const topIde = ides.sort((a: IdeTotals, b: IdeTotals) => b.code_generation_activity_count - a.code_generation_activity_count)[0]

    // For suggestions/acceptances, also check nested totals if top-level is zero
    let suggestions = num(row.code_generation_activity_count)
    let acceptances = num(row.code_acceptance_activity_count)
    let locSuggested = num(row.loc_suggested_to_add_sum)
    let locAccepted = num(row.loc_added_sum)

    // If top-level counts are zero but we have model data, sum from models
    if (suggestions === 0 && models.length > 0) {
      suggestions = models.reduce((s: number, m: ModelFeatureTotals) => s + m.code_generation_activity_count, 0)
      acceptances = models.reduce((s: number, m: ModelFeatureTotals) => s + m.code_acceptance_activity_count, 0)
      locSuggested = models.reduce((s: number, m: ModelFeatureTotals) => s + m.loc_suggested_to_add_sum, 0)
      locAccepted = models.reduce((s: number, m: ModelFeatureTotals) => s + m.loc_added_sum, 0)
    }

    // Extract chat interactions from nested format if needed
    let chatInteractions = num(row.user_initiated_interaction_count)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawRow = row as any
    if (chatInteractions === 0 && rawRow.copilot_ide_chat) {
      chatInteractions = num(rawRow.copilot_ide_chat.total_chats || rawRow.copilot_ide_chat.total_engaged_users)
    }

    records.push({
      date,
      dateKey: format(date, 'yyyy-MM-dd'),
      user,
      suggestions,
      acceptances,
      locSuggested,
      locAccepted,
      chatInteractions,
      usedChat: bool(row.used_chat) || chatInteractions > 0,
      usedAgent: bool(row.used_agent),
      usedCLI: bool(row.used_cli),
      models,
      languages: row.totals_by_language_feature || [],
      ide: topIde?.ide_name || 'Unknown',
    })
  }

  return { records, warnings }
}

export function normaliseCSV(rows: RawCSVRow[]): { records: CopilotRecord[]; warnings: string[] } {
  const records: CopilotRecord[] = []
  const warnings: string[] = []

  for (const row of rows) {
    const dayStr = row.date || row.day || ''
    const date = parseDate(dayStr)
    if (!date) {
      warnings.push(`Invalid date "${dayStr}", skipped`)
      continue
    }

    const user = row.login || row.user_login || 'unknown'
    const suggestions = num(row.suggestions_count || row.total_suggestions_count)
    const acceptances = num(row.acceptances_count || row.total_acceptances_count)
    const locSuggested = num(row.lines_suggested || row.total_lines_suggested)
    const locAccepted = num(row.lines_accepted || row.total_lines_accepted)

    records.push({
      date,
      dateKey: format(date, 'yyyy-MM-dd'),
      user,
      suggestions,
      acceptances,
      locSuggested,
      locAccepted,
      chatInteractions: 0,
      usedChat: false,
      usedAgent: false,
      usedCLI: false,
      models: [],
      languages: [],
      ide: 'Unknown',
    })
  }

  return { records, warnings }
}
