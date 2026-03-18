import { parseNDJSON } from './parsers/parseNDJSON'
import { parseCSV } from './parsers/parseCSV'
import { normaliseNDJSON, normaliseCSV } from './parsers/normalise'
import type { CopilotRecord } from '../types/metrics'

export interface LoadResult {
  records: CopilotRecord[]
  warnings: string[]
  format: 'ndjson' | 'csv'
}

export async function loadFile(file: File): Promise<LoadResult> {
  const text = await file.text()
  const ext = file.name.split('.').pop()?.toLowerCase()
  const trimmed = text.trimStart()

  // Detect format: NDJSON starts with '{', JSON array starts with '[', else CSV
  const isJSON = ext === 'ndjson' || ext === 'jsonl' || ext === 'json'
    || (ext !== 'csv' && (trimmed.startsWith('{') || trimmed.startsWith('[')))

  if (isJSON) {
    let ndjsonText = text
    // If the file is a JSON array, convert it to NDJSON
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(text)
        if (Array.isArray(arr)) {
          ndjsonText = arr.map((item: unknown) => JSON.stringify(item)).join('\n')
        }
      } catch {
        // If JSON.parse fails, fall through and let NDJSON parser handle line-by-line
      }
    }
    const { rows, warnings: parseWarnings } = parseNDJSON(ndjsonText)
    const { records, warnings: normWarnings } = normaliseNDJSON(rows)
    return { records, warnings: [...parseWarnings, ...normWarnings], format: 'ndjson' }
  } else {
    const { rows, warnings: parseWarnings } = parseCSV(text)
    const { records, warnings: normWarnings } = normaliseCSV(rows)
    return { records, warnings: [...parseWarnings, ...normWarnings], format: 'csv' }
  }
}
