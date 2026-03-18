interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string; unit?: string }>
  label?: string
  formatter?: (value: number, name: string) => string
}

export function CustomTooltip({ active, payload, label, formatter }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {formatter ? formatter(entry.value, entry.name) : entry.value.toLocaleString()}
              {entry.unit ? ` ${entry.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
