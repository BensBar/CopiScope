import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import type { CopilotRecord } from '../../types/metrics'
import { getModelDailyTrend, groupByUser } from '../../lib/aggregations'
import { CustomTooltip } from '../charts/CustomTooltip'
import { SUGGESTIONS_COLOR, ACCEPTANCES_COLOR, CHART_COLORS } from '../charts/palette'

interface ModelDetailPanelProps {
  model: string
  records: CopilotRecord[]
}

export function ModelDetailPanel({ model, records }: ModelDetailPanelProps) {
  const dailyTrend = useMemo(() => getModelDailyTrend(records, model), [records, model])

  // Users who used this model and their contribution via model totals
  const userBreakdown = useMemo(() => {
    const map = new Map<string, { user: string; suggestions: number; acceptances: number; locAccepted: number }>()
    for (const r of records) {
      const m = r.models.find((mm) => mm.model_name === model)
      if (!m) continue
      const existing = map.get(r.user)
      if (!existing) {
        map.set(r.user, { user: r.user, suggestions: m.code_generation_activity_count, acceptances: m.code_acceptance_activity_count, locAccepted: m.loc_added_sum })
      } else {
        existing.suggestions += m.code_generation_activity_count
        existing.acceptances += m.code_acceptance_activity_count
        existing.locAccepted += m.loc_added_sum
      }
    }
    return Array.from(map.values()).sort((a, b) => b.suggestions - a.suggestions).slice(0, 10)
  }, [records, model])

  const totalSugg = userBreakdown.reduce((s, u) => s + u.suggestions, 0)
  const totalAcc = userBreakdown.reduce((s, u) => s + u.acceptances, 0)
  const rate = totalSugg > 0 ? (totalAcc / totalSugg) * 100 : 0

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Suggestions', value: totalSugg.toLocaleString() },
          { label: 'Total Acceptances', value: totalAcc.toLocaleString() },
          { label: 'Acceptance Rate', value: `${rate.toFixed(1)}%` },
        ].map((m) => (
          <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Daily Activity for this Model</h4>
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

      {/* Top users */}
      {userBreakdown.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Top Users of this Model</h4>
          <ResponsiveContainer width="100%" height={Math.min(userBreakdown.length * 32 + 40, 260)}>
            <BarChart data={userBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="user" tick={{ fontSize: 10 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="suggestions" fill={CHART_COLORS[0]} name="Suggestions" radius={[0, 2, 2, 0]} />
              <Bar dataKey="acceptances" fill={CHART_COLORS[1]} name="Acceptances" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
