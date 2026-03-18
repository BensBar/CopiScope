import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine,
} from 'recharts'
import { useFilteredRecords } from '../hooks/useFilteredRecords'
import { useAppStore } from '../store/useAppStore'
import { useDrillDown } from '../hooks/useDrillDown'
import { computeOverviewKPIs, groupByModel, groupByUser, computeMonthlyBuckets } from '../lib/aggregations'
import { MetricCard } from '../components/shared/MetricCard'
import { ChartCard } from '../components/shared/ChartCard'
import { DataTable, type Column } from '../components/shared/DataTable'
import { CustomTooltip } from '../components/charts/CustomTooltip'
import { DrillDownModal } from '../components/drilldown/DrillDownModal'
import { ModelDetailPanel } from '../components/drilldown/ModelDetailPanel'
import { MetricBreakdownPanel } from '../components/drilldown/MetricBreakdownPanel'
import { BUDGET_COLOR, COST_COLOR, CHART_COLORS } from '../components/charts/palette'
import type { ModelAggregate } from '../lib/aggregations'

function NumberInput({
  label, value, onChange, prefix, min, max, step, placeholder,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void
  prefix?: string; min?: number; max?: number; step?: number; placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">{prefix}</span>
        )}
        <input
          type="number"
          value={value ?? ''}
          min={min} max={max} step={step ?? 1} placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value === '' ? null : parseFloat(e.target.value)
            onChange(isNaN(v as number) ? null : v)
          }}
          className={`w-full border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )
}

export function CostTab() {
  const filtered = useFilteredRecords()
  const costConfig = useAppStore((s) => s.costConfig)
  const setCostConfig = useAppStore((s) => s.setCostConfig)
  const drill = useDrillDown()

  const kpis = useMemo(() => computeOverviewKPIs(filtered), [filtered])
  const models = useMemo(() => groupByModel(filtered), [filtered])
  const allUsers = useMemo(() => groupByUser(filtered), [filtered])

  const seats = costConfig.activeUserCount ?? kpis.activeUsers
  const monthlyCost = seats * costConfig.pricePerSeat
  const annualCost = monthlyCost * 12
  const overage = costConfig.monthlyBudget != null ? monthlyCost - costConfig.monthlyBudget : null
  const costPerAcceptance = kpis.totalAcceptances > 0 ? monthlyCost / kpis.totalAcceptances : 0
  const costPerLine = kpis.totalLocAccepted > 0 ? monthlyCost / kpis.totalLocAccepted : 0

  const monthlyTrend = useMemo(
    () => computeMonthlyBuckets(filtered, costConfig.pricePerSeat, seats, costConfig.monthlyBudget, costConfig.forecastMonths),
    [filtered, costConfig, seats]
  )

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Per-user cost allocation (proportional to acceptances)
  const userCostBreakdown = useMemo(() => {
    const total = allUsers.reduce((s, u) => s + u.acceptances, 0) || 1
    return allUsers.map((u) => ({
      label: u.user,
      primary: +(((u.acceptances / total) * monthlyCost)).toFixed(2),
      secondary: u.acceptances,
      primaryLabel: 'Allocated Cost ($)',
      secondaryLabel: 'Acceptances',
    }))
  }, [allUsers, monthlyCost])

  const modelRoiColumns: Column<ModelAggregate>[] = [
    { key: 'model', header: 'Model', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'acceptances', header: 'Acceptances', sortable: true, align: 'right', render: (r) => r.acceptances.toLocaleString() },
    { key: 'acceptanceRate', header: 'Accept Rate', sortable: true, align: 'right', render: (r) => `${r.acceptanceRate.toFixed(1)}%` },
    { key: 'locAccepted', header: 'Lines Accepted', sortable: true, align: 'right', render: (r) => r.locAccepted.toLocaleString() },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Config panel */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm dark:shadow-none p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Cost Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumberInput label="Price per seat / mo" value={costConfig.pricePerSeat} onChange={(v) => setCostConfig({ pricePerSeat: v ?? 19 })} prefix="$" min={1} placeholder="19" />
          <NumberInput label="Active seats (override)" value={costConfig.activeUserCount} onChange={(v) => setCostConfig({ activeUserCount: v })} placeholder={`Auto (${kpis.activeUsers})`} min={1} />
          <NumberInput label="Monthly budget" value={costConfig.monthlyBudget} onChange={(v) => setCostConfig({ monthlyBudget: v })} prefix="$" placeholder="No limit" min={0} />
          <NumberInput label="Forecast months" value={costConfig.forecastMonths} onChange={(v) => setCostConfig({ forecastMonths: v ?? 3 })} min={1} max={24} />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          GitHub Copilot is seat-billed. Cost per acceptance and per line are ROI allocation metrics, not billing units.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Monthly Estimate"
          value={`$${fmt(monthlyCost)}`}
          sub={`${seats} seat${seats !== 1 ? 's' : ''} × $${costConfig.pricePerSeat}/mo`}
          accent="blue"
          onClick={() => drill.open('Monthly Cost — User Allocation', (
            <MetricBreakdownPanel
              rows={userCostBreakdown}
              primaryColor={COST_COLOR}
              secondaryColor={CHART_COLORS[1]}
              valueFormatter={(v) => `$${v.toFixed(2)}`}
              description={`Total monthly: $${fmt(monthlyCost)}. Allocated proportionally by acceptance count.`}
            />
          ))}
        />
        <MetricCard
          label="Annual Projection"
          value={`$${fmt(annualCost)}`}
          sub="12-month projection"
          onClick={() => drill.open('Annual Projection — User Allocation', (
            <MetricBreakdownPanel
              rows={userCostBreakdown.map((r) => ({ ...r, primary: +(r.primary * 12).toFixed(2), primaryLabel: 'Annual Cost ($)' }))}
              primaryColor={COST_COLOR}
              valueFormatter={(v) => `$${v.toFixed(2)}`}
              description={`Annual projection: $${fmt(annualCost)} (${seats} seats × $${costConfig.pricePerSeat} × 12 months)`}
            />
          ))}
        />
        <MetricCard
          label="Budget Status"
          value={
            costConfig.monthlyBudget == null
              ? 'No limit set'
              : overage! > 0
              ? `$${fmt(overage!)} over`
              : `$${fmt(Math.abs(overage!))} under`
          }
          accent={costConfig.monthlyBudget == null ? undefined : overage! > 0 ? 'red' : 'green'}
          sub={costConfig.monthlyBudget != null ? `Budget: $${fmt(costConfig.monthlyBudget)}/mo` : undefined}
        />
        <MetricCard
          label="Cost / Acceptance"
          value={`$${costPerAcceptance.toFixed(3)}`}
          sub={`$${costPerLine.toFixed(4)} per accepted line`}
          onClick={() => drill.open('Cost per Acceptance — by User', (
            <MetricBreakdownPanel
              rows={allUsers.filter((u) => u.acceptances > 0).map((u) => ({
                label: u.user,
                primary: +(monthlyCost / u.acceptances).toFixed(4),
                secondary: u.acceptances,
                primaryLabel: 'Cost/Acceptance ($)',
                secondaryLabel: 'Acceptances',
              }))}
              primaryColor={CHART_COLORS[4]}
              valueFormatter={(v) => `$${v.toFixed(3)}`}
              description="Lower cost per acceptance = higher ROI from this user's Copilot usage."
            />
          ))}
        />
      </div>

      {/* Monthly trend chart */}
      <ChartCard title="Monthly Cost vs Budget" subtitle="Actual and projected seat costs">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
            <Tooltip content={<CustomTooltip formatter={(v) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="cost" stroke={COST_COLOR} strokeWidth={2} dot={{ r: 3 }} name="Seat Cost" />
            {costConfig.monthlyBudget != null && (
              <Line type="monotone" dataKey="budget" stroke={BUDGET_COLOR} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Budget" />
            )}
            {costConfig.monthlyBudget != null && (
              <ReferenceLine y={costConfig.monthlyBudget} stroke={BUDGET_COLOR} strokeDasharray="4 4" strokeOpacity={0.5} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Model ROI table */}
      <ChartCard title="Model Breakdown" subtitle="Click a row to drill into that model">
        <DataTable<ModelAggregate>
          columns={modelRoiColumns}
          data={models}
          rowKey={(r) => r.model}
          pageSize={10}
          onRowClick={(r) => drill.open(`Model: ${r.model}`, <ModelDetailPanel model={r.model} records={filtered} />)}
        />
      </ChartCard>

      <DrillDownModal isOpen={drill.isOpen} title={drill.title} onClose={drill.close}>
        {drill.content}
      </DrillDownModal>
    </div>
  )
}
