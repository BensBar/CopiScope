import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/cn'

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  const count = selected.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors',
          count > 0
            ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-900/20 dark:text-blue-400'
            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        )}
      >
        {label}
        {count > 0 && (
          <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
            {count}
          </span>
        )}
        <svg className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg min-w-[180px] py-1 max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">No options</div>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-slate-300 text-blue-600 w-3.5 h-3.5"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {count > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1 px-3 py-1.5">
              <button
                onClick={() => { onChange([]); setOpen(false) }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
