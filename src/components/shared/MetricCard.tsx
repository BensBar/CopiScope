import { cn } from '../../lib/cn'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  delta?: string
  deltaUp?: boolean
  accent?: 'green' | 'red' | 'blue' | 'amber'
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
}

export function MetricCard({ label, value, sub, delta, deltaUp, accent, icon, className, onClick }: MetricCardProps) {
  const isClickable = !!onClick
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm dark:shadow-none flex flex-col gap-1 transition-all',
        isClickable && 'cursor-pointer hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-slate-900/50 hover:border-blue-300 dark:hover:border-blue-500/40 hover:-translate-y-0.5 group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-slate-400">{icon}</span>}
          {isClickable && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span
          className={cn(
            'text-2xl font-bold',
            accent === 'green' && 'text-emerald-600',
            accent === 'red' && 'text-red-600',
            accent === 'blue' && 'text-blue-600',
            accent === 'amber' && 'text-amber-600',
            !accent && 'text-slate-900 dark:text-white'
          )}
        >
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'text-xs font-medium mb-0.5 px-1.5 py-0.5 rounded-full',
              deltaUp ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
            )}
          >
            {deltaUp ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
