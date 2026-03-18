import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import type { CopilotRecord } from '../../types/metrics'
import { computeOverviewKPIs, getUserDailyTrend, groupByModel } from '../../lib/aggregations'
import { CustomTooltip } from '../charts/CustomTooltip'
import { SUGGESTIONS_COLOR, ACCEPTANCES_COLOR, CHART_COLORS } from '../charts/palette'

interface UserDetailPanelProps {
  user: string
  records: CopilotRecord[]
}

export function UserDetailPanel({ user, records }: UserDetailPanelProps) {
  const userRecords = useMemo(() => records.filter((r) => r.user === user), [records, user])
  const kpis = useMemo(() => computeOverviewKPIs(userRecords), [userRecords])
  const dailyTrend = useMemo(() => getUserDailyTrend(records, user), [records, user])
  const models = useMemo(() => groupByModel(userRecords), [userRecords])

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Suggestions', value: kpis.totalSuggestions.toLocaleString() },
          { label: 'Acceptances', value: kpis.totalAcceptances.toLocaleString() },
          { label: 'Accept Rate', value: `${kpis.acceptanceRate.toFixed(1)}%` },
          { label: 'Lines Accepted', value: kpis.totalLocAccepted.toLocaleString() },
          { label: 'Chat Interactions', value: kpis.totalChatInteractions.toLocaleString() },
          { label: 'Active Days', value: dailyTrend.filter((d) => d.suggestions > 0).length },
        ].map((m) => (
          <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Daily Activity</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="suggestions" stroke={SUGGESTIONS_COLOR} dot={false} strokeWidth={2} name="Suggestions" />
            <Line type="monotone" dataKey="acceptances" stroke={ACCEPTANCES_COLOR} dot={false} strokeWidth={2} name="Acceptances" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Model breakdown */}
      {models.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Usage by Model</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={models} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="suggestions" fill={SUGGESTIONS_COLOR} name="Suggestions" radius={[2, 2, 0, 0]} />
              <Bar dataKey="acceptances" fill={ACCEPTANCES_COLOR} name="Acceptances" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Acceptance rate trend */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Acceptance Rate Over Time</h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart
            data={dailyTrend.map((d) => ({ ...d, rate: d.suggestions > 0 ? +((d.acceptances / d.suggestions) * 100).toFixed(1) : 0 }))}
            margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
            <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
            <Line type="monotone" dataKey="rate" stroke={CHART_COLORS[2]} dot={false} strokeWidth={2} name="Acceptance Rate" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
