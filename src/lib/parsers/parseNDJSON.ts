import type { RawNDJSONRow } from '../../types/metrics'

export interface ParseResult {
  rows: RawNDJSONRow[]
  warnings: string[]
}

export function parseNDJSON(text: string): ParseResult {
  const rows: RawNDJSONRow[] = []
  const warnings: string[] = []
  const lines = text.split('\n').filter((l) => l.trim())

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i])
      if (obj && typeof obj === 'object') {
        // Accept both 'day' and 'date' as the date field
        if ('date' in obj && !('day' in obj)) {
          obj.day = obj.date
        }
        if ('day' in obj) {
          rows.push(obj as RawNDJSONRow)
        } else {
          warnings.push(`Line ${i + 1}: missing required "day" or "date" field, skipped`)
        }
      }
    } catch {
      warnings.push(`Line ${i + 1}: invalid JSON, skipped`)
    }
  }

  return { rows, warnings }
}
