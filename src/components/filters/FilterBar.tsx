import { useAppStore } from '../../store/useAppStore'
import { useAllUsers, useAllModels } from '../../hooks/useFilteredRecords'
import { MultiSelect } from './MultiSelect'

export function FilterBar() {
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const resetFilters = useAppStore((s) => s.resetFilters)
  const allUsers = useAllUsers()
  const allModels = useAllModels()

  const hasFilters =
    filters.dateFrom || filters.dateTo || filters.users.length > 0 || filters.models.length > 0

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 px-6 py-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters({ dateFrom: e.target.value || null })}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters({ dateTo: e.target.value || null })}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        {allUsers.length > 0 && (
          <MultiSelect
            label="Users"
            options={allUsers}
            selected={filters.users}
            onChange={(users) => setFilters({ users })}
          />
        )}
        {allModels.length > 0 && (
          <MultiSelect
            label="Models"
            options={allModels}
            selected={filters.models}
            onChange={(models) => setFilters({ models })}
          />
        )}
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
