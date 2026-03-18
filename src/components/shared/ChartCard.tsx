import { cn } from '../../lib/cn'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartCard({ title, subtitle, children, className, action }: ChartCardProps) {
  return (
    <div className={cn('bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-5 shadow-sm dark:shadow-none', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
