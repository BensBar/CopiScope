import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'
import { useFilteredRecords, useAllUsers } from '../hooks/useFilteredRecords'
import { useDrillDown } from '../hooks/useDrillDown'
import {
  groupByUser,
  buildWeeklyTrend,
  getUsageDistribution,
  getActiveInactiveUsers,
  getWeekUserBreakdown,
  getBucketUsers,
} from '../lib/aggregations'
import { MetricCard } from '../components/shared/MetricCard'
import { ChartCard } from '../components/shared/ChartCard'
import { DataTable, type Column } from '../components/shared/DataTable'
import { Badge } from '../components/shared/Badge'
import { CustomTooltip } from '../components/charts/CustomTooltip'
import { DrillDownModal } from '../components/drilldown/DrillDownModal'
import { UserDetailPanel } from '../components/drilldown/UserDetailPanel'
import { MetricBreakdownPanel } from '../components/drilldown/MetricBreakdownPanel'
import { ACTIVE_COLOR, INACTIVE_COLOR, CHART_COLORS } from '../components/charts/palette'
import type { UserAggregate } from '../lib/aggregations'

// Reusable simple user list table inside drill-down
function UserListContent({ users, records, onUser }: { users: UserAggregate[]; records: ReturnType<typeof useFilteredRecords>; onUser: (u: string) => void }) {
  const cols: Column<UserAggregate>[] = [
    { key: 'user', header: 'User', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'acceptances', header: 'Acceptances', sortable: true, align: 'right', render: (r) => r.acceptances.toLocaleString() },
    { key: 'acceptanceRate', header: 'Rate', sortable: true, align: 'right', render: (r) => `${r.acceptanceRate.toFixed(1)}%` },
    { key: 'lastActive', header: 'Last Active', sortable: true },
  ]
  return (
    <DataTable<UserAggregate>
      columns={cols}
      data={users}
      rowKey={(r) => r.user}
      pageSize={20}
      onRowClick={(r) => onUser(r.user)}
    />
  )
}

const BUCKET_RANGES: Record<string, [number, number]> = {
  'Inactive (0)': [0, 0],
  '1–10': [1, 10],
  '11–50': [11, 50],
  '51–200': [51, 200],
  '200+': [201, Infinity],
}

export function AdoptionTab() {
  const filtered = useFilteredRecords()
  const allUsers = useAllUsers()
  const drill = useDrillDown()

  const { active, inactive } = useMemo(() => getActiveInactiveUsers(allUsers, filtered), [allUsers, filtered])
  const weeklyTrend = useMemo(() => buildWeeklyTrend(filtered), [filtered])
  const distribution = useMemo(() => getUsageDistribution(filtered), [filtered])
  const userStats = useMemo(() => groupByUser(filtered), [filtered])

  const openUser = (user: string) =>
    drill.open(`User: ${user}`, <UserDetailPanel user={user} records={filtered} />)

  const pieData = [
    { name: 'Active', value: active.length, color: ACTIVE_COLOR },
    { name: 'Inactive', value: inactive.length, color: INACTIVE_COLOR },
  ]

  const userColumns: Column<UserAggregate>[] = [
    { key: 'user', header: 'User', sortable: true },
    { key: 'suggestions', header: 'Suggestions', sortable: true, align: 'right', render: (r) => r.suggestions.toLocaleString() },
    { key: 'acceptances', header: 'Acceptances', sortable: true, align: 'right', render: (r) => r.acceptances.toLocaleString() },
    { key: 'acceptanceRate', header: 'Accept Rate', sortable: true, align: 'right', render: (r) => `${r.acceptanceRate.toFixed(1)}%` },
    { key: 'chatInteractions', header: 'Chat', sortable: true, align: 'right', render: (r) => r.chatInteractions.toLocaleString() },
    { key: 'lastActive', header: 'Last Active', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (r) => r.suggestions > 0 ? <Badge variant="green">Active</Badge> : <Badge variant="slate">Inactive</Badge>,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Users"
          value={active.length}
          accent="green"
          sub="Have activity in selected range"
          onClick={() =>
            drill.open('Active Users', (
              <UserListContent
                users={userStats.filter((u) => u.suggestions > 0)}
                records={filtered}
                onUser={openUser}
              />
            ))
          }
        />
        <MetricCard
          label="Inactive Seats"
          value={inactive.length}
          accent={inactive.length > 0 ? 'amber' : undefined}
          sub="Licensed but no recorded activity"
          onClick={() =>
            drill.open('Inactive Seats', (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  These {inactive.length} users appear in the dataset but have zero suggestions in the selected date range.
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {inactive.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500 text-center">No inactive users.</p>
                  ) : (
                    inactive.map((u) => (
                      <div key={u} className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                        {u}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          }
        />
        <MetricCard
          label="Adoption Rate"
          value={`${allUsers.length > 0 ? ((active.length / allUsers.length) * 100).toFixed(0) : 0}%`}
          accent="blue"
          sub="Active / total users in dataset"
          onClick={() =>
            drill.open('Adoption Rate — All Users', (
              <MetricBreakdownPanel
                rows={userStats.map((u) => ({
                  label: u.user,
                  primary: u.suggestions,
                  secondary: u.acceptances,
                  primaryLabel: 'Suggestions',
                  secondaryLabel: 'Acceptances',
                }))}
                primaryColor={ACTIVE_COLOR}
                secondaryColor={CHART_COLORS[0]}
                description={`${active.length} of ${allUsers.length} users are active (${((active.length / (allUsers.length || 1)) * 100).toFixed(0)}% adoption).`}
              />
            ))
          }
        />
        <MetricCard
          label="Peak Active Users"
          value={weeklyTrend.length > 0 ? Math.max(...weeklyTrend.map((w) => w.activeUsers)) : 0}
          sub="Highest weekly count"
          onClick={() => {
            const peak = weeklyTrend.reduce((best, w) => w.activeUsers > best.activeUsers ? w : best, weeklyTrend[0])
            if (!peak) return
            const users = getWeekUserBreakdown(filtered, peak.week)
            drill.open(`Peak Week: ${peak.week}`, (
              <UserListContent users={users} records={filtered} onUser={openUser} />
            ))
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <ChartCard title="Active vs Inactive" className="lg:col-span-1">
          <div className="flex flex-col items-center">
            <PieChart width={220} height={200}>
              <Pie
                data={pieData}
                cx={110} cy={100}
                innerRadius={55} outerRadius={90}
                dataKey="value"
                startAngle={90} endAngle={-270}
                onClick={(entry) => {
                  if (entry.name === 'Active') {
                    drill.open('Active Users', (
                      <UserListContent users={userStats.filter((u) => u.suggestions > 0)} records={filtered} onUser={openUser} />
                    ))
                  } else {
                    drill.open('Inactive Users', (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {inactive.map((u) => (
                          <div key={u} className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{u}</div>
                        ))}
                      </div>
                    ))
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [`${v} users`, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
            <div className="flex gap-4 text-xs">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Click a segment to see users</p>
          </div>
        </ChartCard>

        {/* Weekly trend */}
        <ChartCard title="Weekly Active Users Trend" subtitle="Click a data point to see that week's users" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={weeklyTrend}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              onClick={(e) => {
                if (e?.activeLabel) {
                  const users = getWeekUserBreakdown(filtered, e.activeLabel as string)
                  drill.open(`Week of ${e.activeLabel}`, (
                    <UserListContent users={users} records={filtered} onUser={openUser} />
                  ))
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACTIVE_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={ACTIVE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="activeUsers" stroke={ACTIVE_COLOR} strokeWidth={2} fill="url(#activeGrad)" name="Active Users" activeDot={{ r: 5, cursor: 'pointer' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Distribution */}
      <ChartCard title="Usage Distribution" subtitle="Click a bar to see which users are in that bucket">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={distribution}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill={CHART_COLORS[0]}
              name="Users"
              radius={[4, 4, 0, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(d) => {
                const range = BUCKET_RANGES[d.bucket as string]
                if (!range) return
                const users = getBucketUsers(filtered, range[0], range[1])
                drill.open(`Users in bucket "${d.bucket}"`, (
                  <UserListContent users={users} records={filtered} onUser={openUser} />
                ))
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Users table */}
      <ChartCard title="User Activity" subtitle="Click a row to view that user's full detail">
        <DataTable<UserAggregate>
          columns={userColumns}
          data={userStats}
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
