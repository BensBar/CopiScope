/**
 * Insight generation for seat-level usage data.
 *
 * Analyses a `ProcessedData` result and produces human-readable insights
 * (success / warning / danger / info) plus actionable recommendations.
 */

import type {
  ProcessedData,
  Insight,
  RecommendedAction,
  SurfaceBucket,
  ThresholdSettings,
} from '@/types/usage';
import { DEFAULT_THRESHOLDS } from '@/types/usage';

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export function generateInsights(
  data: ProcessedData,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): Insight[] {
  const insights: Insight[] = [];
  const { metrics, hasAuthData, hasDepartmentData, teamMetrics } = data;

  if (metrics.totalSeats === 0) {
    return [{ type: 'info', message: 'No user data available to analyze.' }];
  }

  // --- Active-rate headline ---
  const activeRate = metrics.activeRate;
  if (activeRate >= 70) {
    insights.push({
      type: 'success',
      message: `Copilot active rate is ${activeRate.toFixed(0)}% in the last ${thresholds.activeMaxDays} days. Strong adoption.`,
    });
  } else if (activeRate >= 50) {
    insights.push({
      type: 'info',
      message: `Copilot active rate is ${activeRate.toFixed(0)}% in the last ${thresholds.activeMaxDays} days. Room for improvement.`,
    });
  } else if (activeRate > 0) {
    insights.push({
      type: 'warning',
      message: `Copilot active rate is ${activeRate.toFixed(0)}% in the last ${thresholds.activeMaxDays} days. Adoption needs attention.`,
    });
  }

  // --- Dormant seats ---
  if (metrics.dormantUsers > 0) {
    const dormantPercent = ((metrics.dormantUsers / metrics.totalSeats) * 100).toFixed(0);
    insights.push({
      type: metrics.dormantUsers > metrics.totalSeats * 0.2 ? 'danger' : 'warning',
      message: `${metrics.dormantUsers} seat${metrics.dormantUsers === 1 ? '' : 's'} appear dormant (${thresholds.atRiskMaxDays}+ days inactive), representing ${dormantPercent}% of licenses.`,
    });
  }

  // --- Top surface ---
  const surfaces = Object.entries(metrics.surfaceDistribution)
    .filter(([key]) => key !== 'Unknown')
    .sort(([, a], [, b]) => b - a);

  if (surfaces.length > 0 && surfaces[0][1] > 0) {
    const [topSurface, count] = surfaces[0];
    const surfacePercent = ((count / metrics.totalSeats) * 100).toFixed(0);
    insights.push({
      type: 'info',
      message: `Top Copilot surface is ${topSurface} (${surfacePercent}% of users).`,
    });
  }

  // --- Shelfware ---
  if (hasAuthData && metrics.authButInactive > 0) {
    insights.push({
      type: 'warning',
      message: `${metrics.authButInactive} user${metrics.authButInactive === 1 ? '' : 's'} authenticated recently but haven't used Copilot. Likely shelfware.`,
    });
  }

  // --- At-risk ---
  const atRiskCount = metrics.cohortCounts['at-risk'];
  if (atRiskCount > 0) {
    insights.push({
      type: 'warning',
      message: `${atRiskCount} user${atRiskCount === 1 ? '' : 's'} at risk of becoming dormant (${thresholds.activeMaxDays + 1}-${thresholds.atRiskMaxDays} days inactive).`,
    });
  }

  // --- Unknown surface ---
  const unknownSurfaceCount = metrics.surfaceDistribution['Unknown'];
  if (unknownSurfaceCount > metrics.totalSeats * 0.1) {
    insights.push({
      type: 'info',
      message: `${unknownSurfaceCount} user${unknownSurfaceCount === 1 ? '' : 's'} with unknown Copilot surface. Consider enriching data.`,
    });
  }

  // --- Team-level ---
  if (hasDepartmentData && teamMetrics.length > 0) {
    const decliningTeams = teamMetrics.filter((t) => t.trend === 'declining');
    const improvingTeams = teamMetrics.filter((t) => t.trend === 'improving');

    if (decliningTeams.length > 0) {
      const worstTeam = decliningTeams.sort((a, b) => a.activeRate - b.activeRate)[0];
      insights.push({
        type: 'warning',
        message: `${decliningTeams.length} team${decliningTeams.length === 1 ? '' : 's'} showing declining trends. ${worstTeam.name} has the lowest active rate (${Math.round(worstTeam.activeRate)}%).`,
      });
    }

    if (improvingTeams.length > 0) {
      const bestTeam = improvingTeams.sort((a, b) => b.activeRate - a.activeRate)[0];
      insights.push({
        type: 'success',
        message: `${improvingTeams.length} team${improvingTeams.length === 1 ? '' : 's'} showing improving trends. ${bestTeam.name} leads with ${Math.round(bestTeam.activeRate)}% active rate.`,
      });
    }
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export function generateRecommendations(
  data: ProcessedData,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const { metrics } = data;

  if (metrics.dormantUsers > 0) {
    actions.push({
      title: 'Reclaim dormant seats',
      description: `Review users with ${thresholds.atRiskMaxDays}+ days of inactivity. Consider reassigning licenses to active developers or running re-engagement campaigns.`,
      cohort: 'dormant',
      userCount: metrics.dormantUsers,
    });
  }

  if (metrics.cohortCounts['shelfware'] > 0) {
    actions.push({
      title: 'Run enablement for likely shelfware',
      description:
        'Users who authenticated but never used Copilot may need onboarding support, IDE setup help, or awareness of Copilot features.',
      cohort: 'shelfware',
      userCount: metrics.cohortCounts['shelfware'],
    });
  }

  if (metrics.cohortCounts['at-risk'] > 0) {
    actions.push({
      title: 'Re-engage at-risk users',
      description: `Users inactive for ${thresholds.activeMaxDays + 1}-${thresholds.atRiskMaxDays} days may be experiencing friction. Reach out to understand blockers and provide support.`,
      cohort: 'at-risk',
      userCount: metrics.cohortCounts['at-risk'],
    });
  }

  if (metrics.cohortCounts['data-quality'] > 0) {
    actions.push({
      title: 'Address data quality gaps',
      description:
        'Some records have missing or invalid data. Review and clean up to ensure accurate reporting.',
      cohort: 'data-quality',
      userCount: metrics.cohortCounts['data-quality'],
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTopSurface(data: ProcessedData): SurfaceBucket | null {
  const surfaces = Object.entries(data.metrics.surfaceDistribution)
    .filter(([key]) => key !== 'Unknown')
    .sort(([, a], [, b]) => b - a);

  if (surfaces.length > 0 && surfaces[0][1] > 0) {
    return surfaces[0][0] as SurfaceBucket;
  }
  return null;
}
