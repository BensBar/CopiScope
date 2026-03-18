import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import { useFilteredRecords } from '../hooks/useFilteredRecords'
import { useDrillDown } from '../hooks/useDrillDown'
import {
  computeOverviewKPIs,
  groupByUser,
  groupByModel,
  buildDailyTrend,
} from '../lib/aggregations'
import { MetricCard } from '../components/shared/MetricCard'
import { ChartCard } from '../components/shared/ChartCard'
import { DataTable, type Column } from '../components/shared/DataTable'
import { CustomTooltip } from '../components/charts/CustomTooltip'
import { DrillDownModal } from '../components/drilldown/DrillDownModal'
import { UserDetailPanel } from '../components/drilldown/UserDetailPanel'
import { ModelDetailPanel } from '../components/drilldown/ModelDetailPanel'
import { DayDetailPanel } from '../components/drilldown/DayDetailPanel'
import { MetricBreakdownPanel } from '../components/drilldown/MetricBreakdownPanel'
import { SUGGESTIONS_COLOR, ACCEPTANCES_COLOR, CHART_COLORS } from '../components/charts/palette'
import type { UserAggregate } from '../lib/aggregations'

export function OverviewTab() {
  const filtered = useFilteredRecords()
  const drill = useDrillDown()

  const kpis = useMemo(() => computeOverviewKPIs(filtered), [filtered])
  const allUsers = useMemo(() => groupByUser(filtered), [filtered])
  const topUsers = useMemo(() => allUsers.slice(0, 10), [allUsers])
  const models = useMemo(() => groupByModel(filtered), [filtered])
  const dailyTrend = useMemo(() => buildDailyTrend(filtered), [filtered])

  // Drill helpers
  const openUser = (user: string) =>
    drill.open(`User: ${user}`, <UserDetailPanel user={user} records={filtered} />)

  const openModel = (model: string) =>
    drill.open(`Model: ${model}`, <ModelDetailPanel model={model} records={filtered} />)

  const openDay = (dateKey: string) =>
    drill.open(`Activity on ${dateKey}`, <DayDetailPanel dateKey={dateKey} records={filtered} />)

  const openSuggestions = () =>
    drill.open('Total Suggestions — Breakdown', (
      <MetricBreakdownPanel
        rows={allUsers.map((u) => ({ label: u.user, primary: u.suggestions, secondary: u.acceptances, primaryLabel: 'Suggestions', secondaryLabel: 'Acceptances' }))}
        primaryColor={SUGGESTIONS_COLOR}
        secondaryColor={ACCEPTANCES_COLOR}
        description={`Total: ${kpis.totalSuggestions.toLocaleString()} suggestions across ${kpis.activeUsers} users`}
      />
    ))

  const openAcceptances = () =>
    drill.open('Total Acceptances — Breakdown', (
      <MetricBreakdownPanel
        rows={allUsers.map((u) => ({ label: u.user, primary: u.acceptances, primaryLabel: 'Acceptances' }))}
        primaryColor={ACCEPTANCES_COLOR}
        description={`Total: ${kpis.totalAcceptances.toLocaleString()} acceptances — ${kpis.acceptanceRate.toFixed(1)}% rate`}
      />
    ))

  const openAcceptanceRate = () =>
    drill.open('Acceptance Rate by User', (
      <MetricBreakdownPanel
        rows={allUsers.map((u) => ({ label: u.user, primary: +u.acceptanceRate.toFixed(1), primaryLabel: 'Acceptance Rate (%)' }))}
        primaryColor={CHART_COLORS[2]}
        valueFormatter={(v) => `${v}%`}
        description="Higher is better. Industry average is ~27%."
      />
    ))

  const openActiveUsers = () =>
    drill.open('Active Users', (
      <MetricBreakdownPanel
        rows={allUsers.map((u) => ({ label: u.user, primary: u.suggestions, secondary: u.acceptances, primaryLabel: 'Suggestions', secondaryLabel: 'Acceptances' }))}
        primaryColor={CHART_COLORS[0]}
        secondaryColor={CHART_COLORS[1]}
        description={`${kpis.activeUsers} users have recorded activity in the selected date range.`}
      />
    ))

  const openLines = () =>
    drill.open('Lines Accepted — Breakdown', (
      <MetricBreakdownPanel
        rows={allUsers.map((u) => ({ label: u.user, primary: u.locAccepted, primaryLabel: 'Lines Accepted' }))}
        primaryColor={CHART_COLORS[3]}
        description={`Total: ${kpis.totalLocAccepted.toLocaleString()} lines accepted via Copilot`}
      />
    ))

  const openChat = () =>
    drill.open('Chat Interactions — Breakdown', (
      <MetricBreakdownPanel
        rows={allUsers.filter((u) => u.chatInteractions > 0).map((u) => ({ label: u.user, primary: u.chatInteractions, primaryLabel: 'Chat Interactions' }))}
        primaryColor={CHART_COLORS[0]}
        description={`Total: ${kpis.totalChatInteractions.toLocaleString()} chat interactions`}
      />
    ))

  const userColumns: Column<UserAggregate>[] = [
    { key: 'user', header: 'User', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'acceptances', header: 'Acceptances', sortable: true, align: 'right', render: (r) => r.acceptances.toLocaleString() },
    {
      key: 'acceptanceRate',
      header: 'Accept Rate',
      sortable: true,
      align: 'right',
      render: (r) => (
        <span className={r.acceptanceRate >= 30 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
          {r.acceptanceRate.toFixed(1)}%
        </span>
      ),
    },
    { key: 'locAccepted', header: 'Lines Accepted', sortable: true, align: 'right', render: (r) => r.locAccepted.toLocaleString() },
    { key: 'lastActive', header: 'Last Active', sortable: true },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Total Suggestions"
          value={kpis.totalSuggestions.toLocaleString()}
          onClick={openSuggestions}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.303 0l-.347-.347z" /></svg>}
        />
        <MetricCard
          label="Total Acceptances"
          value={kpis.totalAcceptances.toLocaleString()}
          accent="green"
          onClick={openAcceptances}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        />
        <MetricCard
          label="Acceptance Rate"
          value={`${kpis.acceptanceRate.toFixed(1)}%`}
          accent={kpis.acceptanceRate >= 30 ? 'green' : kpis.acceptanceRate >= 20 ? undefined : 'amber'}
          sub="Industry avg ~27%"
          onClick={openAcceptanceRate}
        />
        <MetricCard
          label="Active Users"
          value={kpis.activeUsers}
          accent="blue"
          onClick={openActiveUsers}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <MetricCard
          label="Lines Accepted"
          value={kpis.totalLocAccepted.toLocaleString()}
          sub="Code committed via Copilot"
          onClick={openLines}
        />
        <MetricCard
          label="Chat Interactions"
          value={kpis.totalChatInteractions.toLocaleString()}
          accent="blue"
          onClick={openChat}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Daily Activity Trend"
          subtitle="Click a data point to see that day's breakdown"
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={dailyTrend}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              onClick={(e) => {
                if (e?.activeLabel) openDay(e.activeLabel as string)
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="suggestions" stroke={SUGGESTIONS_COLOR} dot={false} strokeWidth={2} name="Suggestions" activeDot={{ r: 5, cursor: 'pointer' }} />
              <Line type="monotone" dataKey="acceptances" stroke={ACCEPTANCES_COLOR} dot={false} strokeWidth={2} name="Acceptances" activeDot={{ r: 5, cursor: 'pointer' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Usage by Model" subtitle="Click a bar to drill into that model">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={models} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="model" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="suggestions"
                fill={SUGGESTIONS_COLOR}
                name="Suggestions"
                radius={[3, 3, 0, 0]}
                style={{ cursor: 'pointer' }}
                onClick={(d) => openModel(d.model as string)}
              />
              <Bar
                dataKey="acceptances"
                fill={ACCEPTANCES_COLOR}
                name="Acceptances"
                radius={[3, 3, 0, 0]}
                style={{ cursor: 'pointer' }}
                onClick={(d) => openModel(d.model as string)}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Users Bar Chart */}
      <ChartCard title="Top Users by Acceptances" subtitle="Click a bar to view that user's detail">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topUsers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="user" tick={{ fontSize: 11 }} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="acceptances"
              fill={CHART_COLORS[0]}
              name="Acceptances"
              radius={[0, 3, 3, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(d) => openUser(d.user as string)}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Users Table */}
      <ChartCard title="User Breakdown" subtitle="Click a row to view that user's full detail">
        <DataTable<UserAggregate>
          columns={userColumns}
          data={allUsers}
          rowKey={(r) => r.user}
          pageSize={10}
          onRowClick={(r) => openUser(r.user)}
        />
      </ChartCard>

      <DrillDownModal isOpen={drill.isOpen} title={drill.title} onClose={drill.close}>
        {drill.content}
      </DrillDownModal>
    </div>
  )
}
