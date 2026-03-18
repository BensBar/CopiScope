import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, ReferenceLine, Legend,
} from 'recharts'
import type { CopilotRecord } from '../../types/metrics'
import type { AnomalyRecord } from '../../lib/aggregations'
import { getUserDailyTrend } from '../../lib/aggregations'
import { CustomTooltip } from '../charts/CustomTooltip'
import { SUGGESTIONS_COLOR, SPIKE_COLOR } from '../charts/palette'

interface AnomalyDetailPanelProps {
  anomaly: AnomalyRecord
  records: CopilotRecord[]
}

export function AnomalyDetailPanel({ anomaly, records }: AnomalyDetailPanelProps) {
  const dailyTrend = useMemo(() => getUserDailyTrend(records, anomaly.user), [records, anomaly.user])

  return (
    <div className="space-y-6">
      {/* Context cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Spike Value', value: anomaly.suggestions.toLocaleString() },
          { label: 'User Median', value: anomaly.median.toFixed(0) },
          { label: 'Excess Over Median', value: `+${anomaly.excess.toFixed(0)}` },
          { label: 'Z-Score (MAD)', value: anomaly.zScore.toFixed(2) },
          { label: 'MAD', value: anomaly.mad.toFixed(1) },
          {
            label: 'Severity',
            value: anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1),
          },
        ].map((m) => (
          <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{m.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
        On <strong>{anomaly.date}</strong>, <strong>{anomaly.user}</strong> recorded{' '}
        <strong>{anomaly.suggestions}</strong> suggestions — {anomaly.excess.toFixed(0)} above their
        usual median of {anomaly.median.toFixed(0)} (Z-score: {anomaly.zScore.toFixed(2)}).
      </div>

      {/* Full user daily trend with spike marked */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          {anomaly.user}'s Full Activity History
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyTrend} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="suggestions" stroke={SUGGESTIONS_COLOR} strokeWidth={2} dot={false} name="Suggestions" />
            {/* Median reference line */}
            <ReferenceLine
              y={anomaly.median}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: `median ${anomaly.median.toFixed(0)}`, position: 'right', fontSize: 10, fill: '#94a3b8' }}
            />
            {/* The spike dot */}
            {dailyTrend.find((d) => d.date === anomaly.date) && (
              <ReferenceDot
                x={anomaly.date}
                y={dailyTrend.find((d) => d.date === anomaly.date)!.suggestions}
                r={7}
                fill={SPIKE_COLOR}
                stroke="white"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
