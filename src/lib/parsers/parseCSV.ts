import Papa from 'papaparse'
import type { RawCSVRow } from '../../types/metrics'

export interface CSVParseResult {
  rows: RawCSVRow[]
  warnings: string[]
}

export function parseCSV(text: string): CSVParseResult {
  const warnings: string[] = []

  const result = Papa.parse<RawCSVRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (result.errors.length > 0) {
    result.errors.forEach((e) => {
      warnings.push(`Row ${e.row ?? '?'}: ${e.message}`)
    })
  }

  return { rows: result.data, warnings }
}
