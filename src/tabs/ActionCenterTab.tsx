import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ChartCard } from '@/components/shared/ChartCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { MetricCard } from '@/components/shared/MetricCard'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/cn'
import type { CopilotUser, UserCohort } from '@/types/usage'

// ---------------------------------------------------------------------------
// Cohort helpers
// ---------------------------------------------------------------------------

const COHORT_OPTIONS: { value: UserCohort | 'all'; label: string; variant: 'default' | 'green' | 'amber' | 'red' | 'slate' }[] = [
  { value: 'all', label: 'All Users', variant: 'default' },
  { value: 'active', label: 'Active', variant: 'green' },
  { value: 'at-risk', label: 'At Risk', variant: 'amber' },
  { value: 'dormant', label: 'Dormant', variant: 'red' },
  { value: 'shelfware', label: 'Shelfware', variant: 'amber' },
  { value: 'data-quality', label: 'Data Quality', variant: 'slate' },
]

function formatCohort(c: UserCohort): string {
  const labels: Record<UserCohort, string> = {
    active: 'Active',
    'at-risk': 'At Risk',
    dormant: 'Dormant',
    shelfware: 'Shelfware',
    'data-quality': 'Data Issue',
  }
  return labels[c]
}

function cohortBadgeVariant(c: UserCohort): 'green' | 'amber' | 'red' | 'slate' {
  const map: Record<UserCohort, 'green' | 'amber' | 'red' | 'slate'> = {
    active: 'green',
    'at-risk': 'amber',
    dormant: 'red',
    shelfware: 'amber',
    'data-quality': 'slate',
  }
  return map[c]
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportUsersCSV(users: CopilotUser[], filename: string) {
  const headers = ['Identifier', 'Cohort', 'Days Inactive', 'Surface', 'Department']
  const rows = users.map((u) => [
    u.identifier,
    u.cohort,
    u.daysSinceActivity !== null ? String(u.daysSinceActivity) : '',
    u.surfaceBucket,
    u.department ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columns: Column<CopilotUser>[] = [
  { key: 'identifier', header: 'User', sortable: true, className: 'font-mono text-xs' },
  { key: 'department', header: 'Team', sortable: true, render: (r) => r.department || '—' },
  {
    key: 'daysSinceActivity',
    header: 'Days Inactive',
    sortable: true,
    align: 'right',
    render: (r) =>
      r.daysSinceActivity !== null ? (
        <span
          className={cn(
            'text-xs font-medium',
            r.daysSinceActivity <= 30 && 'text-emerald-600',
            r.daysSinceActivity > 30 && r.daysSinceActivity <= 60 && 'text-amber-600',
            r.daysSinceActivity > 60 && 'text-red-600'
          )}
        >
          {r.daysSinceActivity}d
        </span>
      ) : (
        <span className="text-slate-400 text-xs">—</span>
      ),
  },
  { key: 'surfaceBucket', header: 'Surface' },
  {
    key: 'cohort',
    header: 'Status',
    sortable: true,
    render: (r) => <Badge variant={cohortBadgeVariant(r.cohort)}>{formatCohort(r.cohort)}</Badge>,
  },
]

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function ActionCenterTab() {
  const processedUsageData = useAppStore((s) => s.processedUsageData)
  const [selectedCohort, setSelectedCohort] = useState<UserCohort | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const users = processedUsageData?.users ?? []

  const cohortCounts = useMemo(() => {
    const counts: Record<UserCohort | 'all', number> = {
      all: users.length,
      active: 0,
      'at-risk': 0,
      dormant: 0,
      shelfware: 0,
      'data-quality': 0,
    }
    users.forEach((u) => counts[u.cohort]++)
    return counts
  }, [users])

  const filteredUsers = useMemo(() => {
    let result = users
    if (selectedCohort !== 'all') {
      result = result.filter((u) => u.cohort === selectedCohort)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (u) => u.identifier.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q))
      )
    }
    return result
  }, [users, selectedCohort, searchQuery])

  const handleExport = () => {
    const label = selectedCohort === 'all' ? 'all-users' : selectedCohort
    const filename = `copilot-${label}-${new Date().toISOString().split('T')[0]}.csv`
    exportUsersCSV(filteredUsers, filename)
  }

  if (!processedUsageData) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
        Load seat-level data to use the Action Center.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cohort summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {COHORT_OPTIONS.filter((c) => c.value !== 'all').map((opt) => (
          <MetricCard
            key={opt.value}
            label={opt.label}
            value={cohortCounts[opt.value]}
            accent={opt.variant === 'green' ? 'green' : opt.variant === 'red' ? 'red' : opt.variant === 'amber' ? 'amber' : undefined}
            onClick={() => setSelectedCohort(opt.value as UserCohort)}
            className={selectedCohort === opt.value ? 'ring-2 ring-blue-500/50' : ''}
          />
        ))}
      </div>

      {/* Filters & Table */}
      <ChartCard
        title="Action Center"
        subtitle={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value as UserCohort | 'all')}
              className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {COHORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({cohortCounts[opt.value]})
                </option>
              ))}
            </select>
            <button
              onClick={handleExport}
              disabled={filteredUsers.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        }
      >
        <DataTable
          columns={columns}
          data={filteredUsers}
          rowKey={(r) => r.id}
          pageSize={25}
          emptyMessage="No users match the current filters"
        />
      </ChartCard>
    </div>
  )
}
