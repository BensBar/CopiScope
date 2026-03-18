import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, Legend,
} from 'recharts'
import { useFilteredRecords } from '../hooks/useFilteredRecords'
import { useDrillDown } from '../hooks/useDrillDown'
import { detectAnomalies, buildDailyTrend } from '../lib/aggregations'
import { ChartCard } from '../components/shared/ChartCard'
import { DataTable, type Column } from '../components/shared/DataTable'
import { Badge } from '../components/shared/Badge'
import { CustomTooltip } from '../components/charts/CustomTooltip'
import { DrillDownModal } from '../components/drilldown/DrillDownModal'
import { AnomalyDetailPanel } from '../components/drilldown/AnomalyDetailPanel'
import { DayDetailPanel } from '../components/drilldown/DayDetailPanel'
import { SUGGESTIONS_COLOR, SPIKE_COLOR } from '../components/charts/palette'
import type { AnomalyRecord } from '../lib/aggregations'

export function AnomaliesTab() {
  const filtered = useFilteredRecords()
  const [threshold, setThreshold] = useState(3.5)
  const drill = useDrillDown()

  const anomalies = useMemo(() => detectAnomalies(filtered, threshold), [filtered, threshold])
  const dailyTrend = useMemo(() => buildDailyTrend(filtered), [filtered])
  const anomalyDateSet = useMemo(() => new Set(anomalies.map((a) => a.date)), [anomalies])
  const uniqueAnomalyUsers = new Set(anomalies.map((a) => a.user)).size

  const anomalyColumns: Column<AnomalyRecord>[] = [
    { key: 'user', header: 'User', sortable: true },
    { key: 'date', header: 'Date', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'median', header: 'Median', sortable: true, align: 'right', render: (r) => r.median.toFixed(0) },
    { key: 'zScore', header: 'Z-Score', sortable: true, align: 'right', render: (r) => r.zScore.toFixed(2) },
    { key: 'excess', header: 'Excess', sortable: true, align: 'right', render: (r) => `+${r.excess.toFixed(0)}` },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => (
        <Badge variant={r.severity === 'high' ? 'red' : r.severity === 'medium' ? 'amber' : 'blue'}>
          {r.severity}
        </Badge>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Config bar */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm dark:shadow-none p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Spike Sensitivity</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Uses modified Z-score (MAD). Lower threshold = more sensitive. Default 3.5.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">2.0</span>
            <input
              type="range" min={2.0} max={5.0} step={0.1} value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-40 accent-blue-600"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">5.0</span>
            <span className="inline-flex items-center justify-center w-12 h-7 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-lg">
              {threshold.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary banner */}
      {anomalies.length > 0 ? (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-5 py-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <span className="font-semibold">{anomalies.length} anomalous event{anomalies.length !== 1 ? 's' : ''}</span> detected across{' '}
            <span className="font-semibold">{uniqueAnomalyUsers} user{uniqueAnomalyUsers !== 1 ? 's' : ''}</span> in the selected period.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-5 py-3">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">No anomalies detected at the current sensitivity threshold.</p>
        </div>
      )}

      {/* Trend chart with spike markers */}
      <ChartCard title="Daily Suggestions with Spike Markers" subtitle="Click a red spike dot or any point to investigate">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={dailyTrend}
            margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
            onClick={(e) => {
              if (!e?.activeLabel) return
              const dateKey = e.activeLabel as string
              if (anomalyDateSet.has(dateKey)) {
                const topAnomaly = anomalies.find((a) => a.date === dateKey)
                if (topAnomaly) {
                  drill.open(`Spike on ${dateKey} — ${topAnomaly.user}`, (
                    <AnomalyDetailPanel anomaly={topAnomaly} records={filtered} />
                  ))
                  return
                }
              }
              drill.open(`Activity on ${dateKey}`, <DayDetailPanel dateKey={dateKey} records={filtered} />)
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="suggestions"
              stroke={SUGGESTIONS_COLOR}
              strokeWidth={2}
              dot={false}
              name="Suggestions"
              activeDot={{ r: 5, cursor: 'pointer' }}
            />
            {dailyTrend
              .filter((d) => anomalyDateSet.has(d.date))
              .map((d) => (
                <ReferenceDot
                  key={d.date}
                  x={d.date}
                  y={d.suggestions}
                  r={5}
                  fill={SPIKE_COLOR}
                  stroke="white"
                  strokeWidth={1.5}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Anomaly table */}
      <ChartCard title="Top Outliers" subtitle="Click a row to drill into that anomaly">
        <DataTable<AnomalyRecord>
          columns={anomalyColumns}
          data={anomalies}
          rowKey={(r) => `${r.user}-${r.date}`}
          pageSize={10}
          emptyMessage="No anomalies detected with current settings"
          onRowClick={(r) =>
            drill.open(`Spike: ${r.user} on ${r.date}`, <AnomalyDetailPanel anomaly={r} records={filtered} />)
          }
        />
      </ChartCard>

      <DrillDownModal isOpen={drill.isOpen} title={drill.title} onClose={drill.close}>
        {drill.content}
      </DrillDownModal>
    </div>
  )
}
