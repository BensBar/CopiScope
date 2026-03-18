import { useState } from 'react'
import { cn } from '../../lib/cn'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  pageSize?: number
  className?: string
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  pageSize = 10,
  className,
  emptyMessage = 'No data',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(0)
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey as keyof T]
        const bv = b[sortKey as keyof T]
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide select-none',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align !== 'right' && col.align !== 'center' && 'text-left',
                    col.sortable && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200',
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === String(col.key) && (
                      <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
              {onRowClick && <th className="w-6" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onRowClick ? 1 : 0)} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 group' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3 text-slate-700 dark:text-slate-300',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="pr-3 text-right">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                        <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
