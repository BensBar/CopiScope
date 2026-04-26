import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { MetricCard } from '@/components/shared/MetricCard'
import { ChartCard } from '@/components/shared/ChartCard'
import { Badge } from '@/components/shared/Badge'
import { generateInsights, generateRecommendations } from '@/lib/analysis/insights'
import { getComparisonInsights } from '@/lib/analysis/comparison'
import type { ProcessedData, Insight, RecommendedAction, ComparisonData } from '@/types/usage'
import { cn } from '@/lib/cn'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const insightStyles: Record<Insight['type'], { bg: string; text: string; label: string }> = {
  success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'Success' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', label: 'Warning' },
  danger: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Attention' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', label: 'Info' },
}

function InsightCard({ insight }: { insight: Insight }) {
  const style = insightStyles[insight.type]
  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-lg border-l-[3px]', style.bg, `border-l-current ${style.text}`)}>
      <Badge variant={insight.type === 'success' ? 'green' : insight.type === 'warning' ? 'amber' : insight.type === 'danger' ? 'red' : 'blue'}>
        {style.label}
      </Badge>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{insight.message}</p>
    </div>
  )
}

function RecommendationCard({ action, onNavigate }: { action: RecommendedAction; onNavigate: (cohort: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(action.cohort)}
      className="w-full text-left p-4 bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 transition-all group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {action.title}
        </span>
        <Badge variant="blue">{action.userCount} user{action.userCount !== 1 ? 's' : ''}</Badge>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{action.description}</p>
    </button>
  )
}

function ComparisonSummary({ comparison }: { comparison: ComparisonData }) {
  const textInsights = getComparisonInsights(comparison)
  const { changes } = comparison

  return (
    <ChartCard title="Period Comparison" subtitle={`${comparison.baselineName} → ${comparison.currentName}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricCard
          label="Total Seats"
          value={comparison.currentMetrics.totalSeats}
          delta={changes.totalSeatsChange !== 0 ? `${Math.abs(changes.totalSeatsChange)}` : undefined}
          deltaUp={changes.totalSeatsChange > 0}
          sub={`from ${comparison.baselineMetrics.totalSeats}`}
        />
        <MetricCard
          label="Active Users"
          value={comparison.currentMetrics.activeUsers}
          delta={changes.activeUsersChange !== 0 ? `${Math.abs(changes.activeUsersChange)}` : undefined}
          deltaUp={changes.activeUsersChange > 0}
          accent="green"
          sub={`from ${comparison.baselineMetrics.activeUsers}`}
        />
        <MetricCard
          label="Active Rate"
          value={`${comparison.currentMetrics.activeRate.toFixed(1)}%`}
          delta={changes.activeRateChange !== 0 ? `${Math.abs(changes.activeRateChange).toFixed(1)}pp` : undefined}
          deltaUp={changes.activeRateChange > 0}
          accent={changes.activeRateChange >= 0 ? 'green' : 'red'}
        />
        <MetricCard
          label="Dormant"
          value={comparison.currentMetrics.dormantUsers}
          delta={changes.dormantUsersChange !== 0 ? `${Math.abs(changes.dormantUsersChange)}` : undefined}
          deltaUp={changes.dormantUsersChange < 0}
          accent={changes.dormantUsersChange <= 0 ? 'green' : 'red'}
        />
      </div>

      {textInsights.length > 0 && (
        <ul className="space-y-1.5 mt-3">
          {textInsights.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

export function InsightsTab() {
  const records = useAppStore((s) => s.records)
  const processedUsageData = useAppStore((s) => s.processedUsageData)
  const comparisonData = useAppStore((s) => s.comparisonData)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const { insights, recommendations } = useMemo(() => {
    if (!processedUsageData) {
      return { insights: [] as Insight[], recommendations: [] as RecommendedAction[] }
    }
    return {
      insights: generateInsights(processedUsageData),
      recommendations: generateRecommendations(processedUsageData),
    }
  }, [processedUsageData])

  const handleNavigate = (cohort: string) => {
    // Navigate to Action Center tab with the cohort pre-selected
    void cohort
    setActiveTab('action-center')
  }

  if (!processedUsageData && records.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
        Load data to see insights and recommendations.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* KPI row */}
      {processedUsageData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Seats" value={processedUsageData.metrics.totalSeats} />
          <MetricCard
            label="Active Users"
            value={processedUsageData.metrics.activeUsers}
            accent="green"
            sub={`${processedUsageData.metrics.activeRate.toFixed(0)}% active rate`}
          />
          <MetricCard
            label="At Risk"
            value={processedUsageData.metrics.cohortCounts['at-risk']}
            accent="amber"
          />
          <MetricCard
            label="Dormant"
            value={processedUsageData.metrics.dormantUsers}
            accent="red"
          />
        </div>
      )}

      {/* Insights & Recommendations */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Key Insights">
          {insights.length === 0 ? (
            <p className="text-sm text-slate-400">No insights available.</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Recommended Actions">
          {recommendations.length === 0 ? (
            <p className="text-sm text-slate-400">No actions required — adoption looks healthy.</p>
          ) : (
            <div className="space-y-3">
              {recommendations.map((action, i) => (
                <RecommendationCard key={i} action={action} onNavigate={handleNavigate} />
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Period comparison */}
      {comparisonData && <ComparisonSummary comparison={comparisonData} />}
    </div>
  )
}
