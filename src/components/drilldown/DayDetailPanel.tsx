import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { CopilotRecord } from '../../types/metrics'
import { getDayUserBreakdown } from '../../lib/aggregations'
import { DataTable, type Column } from '../shared/DataTable'
import { CustomTooltip } from '../charts/CustomTooltip'
import { SUGGESTIONS_COLOR, ACCEPTANCES_COLOR } from '../charts/palette'
import type { UserAggregate } from '../../lib/aggregations'

interface DayDetailPanelProps {
  dateKey: string
  records: CopilotRecord[]
}

export function DayDetailPanel({ dateKey, records }: DayDetailPanelProps) {
  const users = useMemo(() => getDayUserBreakdown(records, dateKey), [records, dateKey])

  const totalSugg = users.reduce((s, u) => s + u.suggestions, 0)
  const totalAcc = users.reduce((s, u) => s + u.acceptances, 0)

  const columns: Column<UserAggregate>[] = [
    { key: 'user', header: 'User', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'acceptances', header: 'Acceptances', sortable: true, align: 'right', render: (r) => r.acceptances.toLocaleString() },
    { key: 'acceptanceRate', header: 'Rate', sortable: true, align: 'right', render: (r) => `${r.acceptanceRate.toFixed(1)}%` },
    { key: 'locAccepted', header: 'Lines', sortable: true, align: 'right', render: (r) => r.locAccepted.toLocaleString() },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Users', value: users.length },
          { label: 'Total Suggestions', value: totalSugg.toLocaleString() },
          { label: 'Total Acceptances', value: totalAcc.toLocaleString() },
        ].map((m) => (
          <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {users.length > 0 && (
        <>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Activity by User</h4>
            <ResponsiveContainer width="100%" height={Math.min(users.length * 32 + 40, 280)}>
              <BarChart data={users} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="user" tick={{ fontSize: 10 }} width={70} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="suggestions" fill={SUGGESTIONS_COLOR} name="Suggestions" radius={[0, 2, 2, 0]} />
                <Bar dataKey="acceptances" fill={ACCEPTANCES_COLOR} name="Acceptances" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">User Table</h4>
            <DataTable<UserAggregate>
              columns={columns}
              data={users}
              rowKey={(r) => r.user}
              pageSize={20}
            />
          </div>
        </>
      )}

      {users.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">No activity recorded on this date.</div>
      )}
    </div>
  )
}
