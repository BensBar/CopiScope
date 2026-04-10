import { useState } from 'react'
import { cn } from '@/lib/cn'
import { autoDetectColumns, isMappingComplete, getMappingConfidence } from '@/lib/ingest/csvColumnMapper'
import type { ColumnMapping, ParsedCSV } from '@/types/usage'

// ---------------------------------------------------------------------------
// Props & constants
// ---------------------------------------------------------------------------

interface ColumnMapperProps {
  csv: ParsedCSV
  initialMapping: ColumnMapping
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

const FIELD_LABELS: Record<keyof ColumnMapping, { label: string; required: boolean; description: string }> = {
  identifier: { label: 'User Identifier', required: true, description: 'GitHub login, email, or user ID' },
  lastActivity: { label: 'Last Activity Date', required: true, description: 'When user last used Copilot' },
  lastAuthenticated: { label: 'Last Authenticated', required: false, description: 'When user last signed in' },
  lastSurface: { label: 'Last Surface Used', required: false, description: 'Which Copilot product was used' },
  department: { label: 'Department / Team', required: false, description: 'Team grouping for comparison' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColumnMapper({ csv, initialMapping, onConfirm, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping)

  const isValid = mapping.identifier !== null && mapping.lastActivity !== null
  const confidence = getMappingConfidence(mapping)

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value === '__none__' ? null : value,
    }))
  }

  const getPreviewValue = (column: string | null): string => {
    if (!column || csv.rows.length === 0) return '—'
    const value = csv.rows[0][column]
    return value?.substring(0, 25) || '—'
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Column Mapping Required</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Map your CSV columns to the expected fields. Confidence: {confidence}%
          </p>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-5">
          {(Object.keys(FIELD_LABELS) as Array<keyof ColumnMapping>).map((field) => {
            const { label, required, description } = FIELD_LABELS[field]
            const currentValue = mapping[field]
            const hasValue = currentValue !== null

            return (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {hasValue && (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {!required && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={currentValue || '__none__'}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className="flex-1 text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="__none__">— None —</option>
                    {csv.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                  {hasValue && (
                    <span className="flex-shrink-0 text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-700 px-2 py-1.5 rounded max-w-[130px] truncate">
                      {getPreviewValue(currentValue)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {csv.rows.length.toLocaleString()} rows
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              disabled={!isValid}
              className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
