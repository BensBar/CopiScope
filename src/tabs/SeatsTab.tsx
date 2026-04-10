import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MetricCard } from '@/components/shared/MetricCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/cn'
import type { CopilotSeatsResponse } from '@/types/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { getCopilotSeats, getAdoptionStatus } from '@/lib/ingest/apiLoader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SeatRow = CopilotSeatsResponse['seats'][number]

function getActivityStatus(lastActivity: string | null): { label: string; variant: 'green' | 'amber' | 'red' | 'slate'; days: number } {
  if (!lastActivity) return { label: 'Never', variant: 'slate', days: -1 }
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 1) return { label: 'Today', variant: 'green', days }
  if (days <= 7) return { label: `${days}d ago`, variant: 'green', days }
  if (days <= 30) return { label: `${days}d ago`, variant: 'amber', days }
  return { label: `${days}d ago`, variant: 'red', days }
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280']

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const seatColumns: Column<SeatRow>[] = [
  {
    key: 'assignee',
    header: 'User',
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <img
          src={row.assignee.avatar_url}
          alt={row.assignee.login}
          className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700"
        />
        <span className="font-mono text-xs">{row.assignee.login}</span>
      </div>
    ),
  },
  {
    key: 'assigning_team',
    header: 'Team',
    sortable: true,
    render: (row) => row.assigning_team?.name ?? <span className="text-slate-400">—</span>,
  },
  {
    key: 'last_activity_editor',
    header: 'Editor',
    render: (row) => row.last_activity_editor ?? <span className="text-slate-400">—</span>,
  },
  {
    key: 'last_activity_at',
    header: 'Last Active',
    sortable: true,
    render: (row) => {
      const status = getActivityStatus(row.last_activity_at)
      return <Badge variant={status.variant}>{status.label}</Badge>
    },
  },
]

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function SeatsTab() {
  const apiSeats = useAppStore((s) => s.apiData?.seats ?? null)
  const dataSource = useAppStore((s) => s.dataSource)
  const [localSeats, setLocalSeats] = useState<CopilotSeatsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const seatsData = apiSeats ?? localSeats

  // Load mock data if nothing is available
  useEffect(() => {
    if (!seatsData && !loading) {
      setLoading(true)
      getCopilotSeats()
        .then(setLocalSeats)
        .finally(() => setLoading(false))
    }
  }, [seatsData, loading])

  const stats = useMemo(() => {
    if (!seatsData) return null
    const seats = seatsData.seats
    const totalSeats = seatsData.total_seats
    const activeSeats = seats.filter((s) => {
      const status = getActivityStatus(s.last_activity_at)
      return status.days >= 0 && status.days <= 30
    }).length

    const adoption = getAdoptionStatus(activeSeats, totalSeats)

    // Team distribution
    const teamCounts: Record<string, number> = {}
    seats.forEach((s) => {
      const team = s.assigning_team?.name || 'Unassigned'
      teamCounts[team] = (teamCounts[team] || 0) + 1
    })
    const teamData = Object.entries(teamCounts).map(([name, value]) => ({ name, value }))

    // Editor distribution
    const editorCounts: Record<string, number> = {}
    seats.forEach((s) => {
      const editor = s.last_activity_editor || 'Unknown'
      editorCounts[editor] = (editorCounts[editor] || 0) + 1
    })
    const editorData = Object.entries(editorCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

    // Activity distribution
    let today = 0, thisWeek = 0, thisMonth = 0, older = 0, never = 0
    seats.forEach((s) => {
      const { days } = getActivityStatus(s.last_activity_at)
      if (days < 0) never++
      else if (days <= 1) today++
      else if (days <= 7) thisWeek++
      else if (days <= 30) thisMonth++
      else older++
    })
    const activityData = [
      { name: 'Today', value: today },
      { name: 'This Week', value: thisWeek },
      { name: 'This Month', value: thisMonth },
      { name: 'Older', value: older },
      { name: 'Never', value: never },
    ].filter((d) => d.value > 0)

    return { totalSeats, activeSeats, adoption, teamData, editorData, activityData }
  }, [seatsData])

  if (loading || !seatsData || !stats) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
        Loading seat data…
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Seats" value={stats.totalSeats} />
        <MetricCard label="Active (30d)" value={stats.activeSeats} accent="green" />
        <MetricCard
          label="Utilization"
          value={`${stats.adoption.ratio}%`}
          accent={stats.adoption.status === 'Strong' ? 'green' : stats.adoption.status === 'Moderate' ? 'amber' : 'red'}
          sub={stats.adoption.status}
        />
        <MetricCard
          label="Assigned (sample)"
          value={seatsData.seats.length}
          sub={dataSource === 'api' ? 'from API' : 'mock data'}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-3 gap-6">
        <ChartCard title="Team Distribution">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.teamData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {stats.teamData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Editor Preference">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.editorData} layout="vertical" margin={{ left: 5, right: 15 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.editorData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Activity Distribution">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.activityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {stats.activityData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Seat table */}
      <ChartCard title="Seat Assignments" subtitle={`${seatsData.seats.length} seats loaded`}>
        <DataTable
          columns={seatColumns}
          data={seatsData.seats}
          rowKey={(r) => String(r.assignee.id)}
          pageSize={10}
          emptyMessage="No seats found"
        />
      </ChartCard>
    </div>
  )
}
