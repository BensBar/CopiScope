import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CustomTooltip } from '../charts/CustomTooltip'
import { DataTable, type Column } from '../shared/DataTable'

export interface BreakdownRow {
  label: string
  primary: number
  secondary?: number
  primaryLabel?: string
  secondaryLabel?: string
  unit?: string
}

interface MetricBreakdownPanelProps {
  rows: BreakdownRow[]
  primaryColor: string
  secondaryColor?: string
  valueFormatter?: (v: number) => string
  description?: string
}

export function MetricBreakdownPanel({
  rows,
  primaryColor,
  secondaryColor,
  valueFormatter = (v) => v.toLocaleString(),
  description,
}: MetricBreakdownPanelProps) {
  const primaryLabel = rows[0]?.primaryLabel ?? 'Value'
  const secondaryLabel = rows[0]?.secondaryLabel ?? 'Secondary'

  const columns: Column<BreakdownRow>[] = [
    { key: 'label', header: 'Name', sortable: true },
    {
      key: 'primary',
      header: primaryLabel,
      sortable: true,
      align: 'right',
      render: (r) => valueFormatter(r.primary),
    },
    ...(rows.some((r) => r.secondary !== undefined)
      ? [
          {
            key: 'secondary' as const,
            header: secondaryLabel,
            sortable: true,
            align: 'right' as const,
            render: (r: BreakdownRow) => r.secondary !== undefined ? valueFormatter(r.secondary) : '—',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={Math.min(rows.length * 36 + 40, 320)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={valueFormatter} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
          <Tooltip content={<CustomTooltip formatter={valueFormatter} />} />
          <Bar dataKey="primary" fill={primaryColor} name={primaryLabel} radius={[0, 3, 3, 0]} />
          {secondaryColor && rows.some((r) => r.secondary !== undefined) && (
            <Bar dataKey="secondary" fill={secondaryColor} name={secondaryLabel} radius={[0, 3, 3, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <DataTable<BreakdownRow>
        columns={columns}
        data={rows}
        rowKey={(r) => r.label}
        pageSize={20}
      />
    </div>
  )
}
