import { cn } from '../../lib/cn'

type BadgeVariant = 'default' | 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'slate'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}
