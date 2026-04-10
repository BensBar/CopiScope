/**
 * Seat-level data processor.
 *
 * Takes a parsed CSV (headers + rows) together with a column mapping and
 * produces cohort assignments, activity buckets, surface normalization,
 * data-quality warnings and per-team metrics.
 */

import type {
  CopilotUser,
  ColumnMapping,
  ParsedCSV,
  ProcessedData,
  ActivityBucket,
  SurfaceBucket,
  UserCohort,
  DataQualityIssue,
  DataQualityWarning,
  UsageDashboardMetrics,
  TeamMetrics,
  ThresholdSettings,
} from '@/types/usage';
import { DEFAULT_THRESHOLDS } from '@/types/usage';

// ---------------------------------------------------------------------------
// Surface normalisation
// ---------------------------------------------------------------------------

const SURFACE_MAPPINGS: Record<string, SurfaceBucket> = {
  'chat': 'Copilot Chat',
  'copilot chat': 'Copilot Chat',
  'github copilot chat': 'Copilot Chat',
  'vscode-chat': 'Copilot Chat',
  'jetbrains-chat': 'Copilot Chat',

  'ide': 'Copilot in the IDE',
  'vscode': 'Copilot in the IDE',
  'vs code': 'Copilot in the IDE',
  'visual studio code': 'Copilot in the IDE',
  'jetbrains': 'Copilot in the IDE',
  'neovim': 'Copilot in the IDE',
  'vim': 'Copilot in the IDE',
  'editor': 'Copilot in the IDE',
  'visual studio': 'Copilot in the IDE',
  'xcode': 'Copilot in the IDE',
  'intellij': 'Copilot in the IDE',
  'pycharm': 'Copilot in the IDE',
  'webstorm': 'Copilot in the IDE',
  'phpstorm': 'Copilot in the IDE',
  'rider': 'Copilot in the IDE',
  'goland': 'Copilot in the IDE',
  'rubymine': 'Copilot in the IDE',
  'clion': 'Copilot in the IDE',
  'android studio': 'Copilot in the IDE',
  'azure data studio': 'Copilot in the IDE',

  'cli': 'Copilot CLI',
  'command line': 'Copilot CLI',
  'terminal': 'Copilot CLI',
  'shell': 'Copilot CLI',
  'github copilot cli': 'Copilot CLI',
  'copilot cli': 'Copilot CLI',
  'ghcs': 'Copilot CLI',

  'github.com': 'Copilot on GitHub.com',
  'github': 'Copilot on GitHub.com',
  'web': 'Copilot on GitHub.com',
  'browser': 'Copilot on GitHub.com',
  'dotcom': 'Copilot on GitHub.com',
  'github web': 'Copilot on GitHub.com',
  'copilot workspace': 'Copilot on GitHub.com',
};

function normalizeSurface(surface: string | null): SurfaceBucket {
  if (!surface) return 'Unknown';

  const normalized = surface.toLowerCase().trim();

  for (const [pattern, bucket] of Object.entries(SURFACE_MAPPINGS)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return bucket;
    }
  }

  return 'Unknown';
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const cleaned = dateStr.trim();
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) {
    const parts = cleaned.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
    if (parts) {
      const [, first, second, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const attempt1 = new Date(`${fullYear}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`);
      if (!isNaN(attempt1.getTime())) return attempt1;

      const attempt2 = new Date(`${fullYear}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`);
      if (!isNaN(attempt2.getTime())) return attempt2;
    }
    return null;
  }

  return date;
}

function getDaysSince(date: Date | null, now: Date): number | null {
  if (!date) return null;
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Bucketing helpers
// ---------------------------------------------------------------------------

function getActivityBucket(
  days: number | null,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): ActivityBucket {
  if (days === null) return 'unknown';
  if (days <= 7) return '0-7';
  if (days <= 14) return '8-14';
  if (days <= thresholds.activeMaxDays) return '15-30';
  if (days <= thresholds.atRiskMaxDays) return '31-60';
  return '60+';
}

function getCohort(
  daysSinceActivity: number | null,
  daysSinceAuth: number | null,
  hasDataQualityIssues: boolean,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): UserCohort {
  if (hasDataQualityIssues && daysSinceActivity === null) {
    return 'data-quality';
  }

  if (
    daysSinceAuth !== null &&
    daysSinceAuth <= thresholds.recentAuthDays &&
    (daysSinceActivity === null || daysSinceActivity > thresholds.atRiskMaxDays)
  ) {
    return 'shelfware';
  }

  if (daysSinceActivity === null) return 'data-quality';
  if (daysSinceActivity <= thresholds.activeMaxDays) return 'active';
  if (daysSinceActivity <= thresholds.atRiskMaxDays) return 'at-risk';
  return 'dormant';
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function processData(
  csv: ParsedCSV,
  mapping: ColumnMapping,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): ProcessedData {
  const now = new Date();
  const seenIdentifiers = new Set<string>();
  const duplicates = new Set<string>();
  const users: CopilotUser[] = [];

  let missingActivityCount = 0;
  let unknownSurfaceCount = 0;
  let futureDateCount = 0;

  for (let i = 0; i < csv.rows.length; i++) {
    const row = csv.rows[i];
    const identifier = mapping.identifier ? row[mapping.identifier]?.trim() : '';

    if (!identifier) continue;

    const dataQualityIssues: DataQualityIssue[] = [];

    if (seenIdentifiers.has(identifier.toLowerCase())) {
      duplicates.add(identifier.toLowerCase());
      dataQualityIssues.push('duplicate-user');
    }
    seenIdentifiers.add(identifier.toLowerCase());

    const lastActivity = mapping.lastActivity ? parseDate(row[mapping.lastActivity]) : null;
    const lastAuthenticated = mapping.lastAuthenticated
      ? parseDate(row[mapping.lastAuthenticated])
      : null;
    const lastSurface = mapping.lastSurface ? row[mapping.lastSurface] : null;
    const department = mapping.department ? row[mapping.department]?.trim() || null : null;

    if (!lastActivity) {
      missingActivityCount++;
      dataQualityIssues.push('missing-activity-date');
    }

    if (lastActivity && lastActivity > now) {
      futureDateCount++;
      dataQualityIssues.push('future-date');
    }

    const surfaceBucket = normalizeSurface(lastSurface);
    if (lastSurface && surfaceBucket === 'Unknown') {
      unknownSurfaceCount++;
      dataQualityIssues.push('unknown-surface');
    }

    const daysSinceActivity = getDaysSince(lastActivity, now);
    const daysSinceAuth = getDaysSince(lastAuthenticated, now);

    users.push({
      id: `user-${i}`,
      identifier,
      lastActivity,
      lastAuthenticated,
      lastSurface,
      department,
      daysSinceActivity,
      daysSinceAuth,
      activityBucket: getActivityBucket(daysSinceActivity, thresholds),
      surfaceBucket,
      cohort: getCohort(
        daysSinceActivity,
        daysSinceAuth,
        dataQualityIssues.includes('missing-activity-date'),
        thresholds,
      ),
      dataQualityIssues,
    });
  }

  const warnings: DataQualityWarning[] = [];

  if (missingActivityCount > 0) {
    warnings.push({
      type: 'missing-activity-date',
      count: missingActivityCount,
      message: `${missingActivityCount} user${missingActivityCount === 1 ? '' : 's'} missing activity date`,
    });
  }

  if (unknownSurfaceCount > 0) {
    warnings.push({
      type: 'unknown-surface',
      count: unknownSurfaceCount,
      message: `${unknownSurfaceCount} user${unknownSurfaceCount === 1 ? '' : 's'} with unknown Copilot surface`,
    });
  }

  if (duplicates.size > 0) {
    warnings.push({
      type: 'duplicate-user',
      count: duplicates.size,
      message: `${duplicates.size} duplicate user identifier${duplicates.size === 1 ? '' : 's'} found`,
    });
  }

  if (futureDateCount > 0) {
    warnings.push({
      type: 'future-date',
      count: futureDateCount,
      message: `${futureDateCount} user${futureDateCount === 1 ? '' : 's'} with future dates`,
    });
  }

  const metrics = computeMetrics(users, mapping.lastAuthenticated !== null, thresholds);
  const hasDepartmentData = mapping.department !== null && users.some((u) => u.department !== null);
  const teamMetrics = hasDepartmentData ? computeTeamMetrics(users, thresholds) : [];

  return {
    users,
    metrics,
    warnings,
    hasAuthData: mapping.lastAuthenticated !== null,
    hasDepartmentData,
    teamMetrics,
  };
}

// ---------------------------------------------------------------------------
// Aggregate metrics
// ---------------------------------------------------------------------------

function computeMetrics(
  users: CopilotUser[],
  hasAuthData: boolean,
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): UsageDashboardMetrics {
  const totalSeats = users.length;

  const activityDistribution: Record<ActivityBucket, number> = {
    '0-7': 0,
    '8-14': 0,
    '15-30': 0,
    '31-60': 0,
    '60+': 0,
    'unknown': 0,
  };

  const surfaceDistribution: Record<SurfaceBucket, number> = {
    'Copilot Chat': 0,
    'Copilot in the IDE': 0,
    'Copilot CLI': 0,
    'Copilot on GitHub.com': 0,
    'Unknown': 0,
  };

  const cohortCounts: Record<UserCohort, number> = {
    'active': 0,
    'at-risk': 0,
    'dormant': 0,
    'shelfware': 0,
    'data-quality': 0,
  };

  let activeUsers = 0;
  let inactiveUsers = 0;
  let dormantUsers = 0;
  let authButInactive = 0;

  for (const user of users) {
    activityDistribution[user.activityBucket]++;
    surfaceDistribution[user.surfaceBucket]++;
    cohortCounts[user.cohort]++;

    if (user.daysSinceActivity !== null) {
      if (user.daysSinceActivity <= thresholds.activeMaxDays) {
        activeUsers++;
      } else {
        inactiveUsers++;
        if (user.daysSinceActivity > thresholds.atRiskMaxDays) {
          dormantUsers++;
        }
      }
    }

    if (hasAuthData && user.daysSinceAuth !== null && user.daysSinceAuth <= thresholds.recentAuthDays) {
      if (user.daysSinceActivity === null || user.daysSinceActivity > thresholds.activeMaxDays) {
        authButInactive++;
      }
    }
  }

  const usersWithActivity = users.filter((u) => u.daysSinceActivity !== null).length;
  const activeRate = usersWithActivity > 0 ? (activeUsers / usersWithActivity) * 100 : 0;

  return {
    totalSeats,
    activeUsers,
    inactiveUsers,
    dormantUsers,
    authButInactive,
    activeRate,
    activityDistribution,
    surfaceDistribution,
    cohortCounts,
  };
}

// ---------------------------------------------------------------------------
// Per-team / department metrics
// ---------------------------------------------------------------------------

function computeTeamMetrics(
  users: CopilotUser[],
  thresholds: ThresholdSettings = DEFAULT_THRESHOLDS,
): TeamMetrics[] {
  const teamMap = new Map<string, CopilotUser[]>();

  for (const user of users) {
    const team = user.department || 'Unassigned';
    if (!teamMap.has(team)) {
      teamMap.set(team, []);
    }
    teamMap.get(team)!.push(user);
  }

  const teamMetrics: TeamMetrics[] = [];

  for (const [name, teamUsers] of teamMap) {
    const totalSeats = teamUsers.length;

    const activityDistribution: Record<ActivityBucket, number> = {
      '0-7': 0,
      '8-14': 0,
      '15-30': 0,
      '31-60': 0,
      '60+': 0,
      'unknown': 0,
    };

    const surfaceDistribution: Record<SurfaceBucket, number> = {
      'Copilot Chat': 0,
      'Copilot in the IDE': 0,
      'Copilot CLI': 0,
      'Copilot on GitHub.com': 0,
      'Unknown': 0,
    };

    const cohortCounts: Record<UserCohort, number> = {
      'active': 0,
      'at-risk': 0,
      'dormant': 0,
      'shelfware': 0,
      'data-quality': 0,
    };

    let activeUsers = 0;
    let inactiveUsers = 0;
    let dormantUsers = 0;
    let totalDaysSinceActivity = 0;
    let usersWithActivity = 0;

    for (const user of teamUsers) {
      activityDistribution[user.activityBucket]++;
      surfaceDistribution[user.surfaceBucket]++;
      cohortCounts[user.cohort]++;

      if (user.daysSinceActivity !== null) {
        usersWithActivity++;
        totalDaysSinceActivity += user.daysSinceActivity;

        if (user.daysSinceActivity <= thresholds.activeMaxDays) {
          activeUsers++;
        } else {
          inactiveUsers++;
          if (user.daysSinceActivity > thresholds.atRiskMaxDays) {
            dormantUsers++;
          }
        }
      }
    }

    const activeRate = usersWithActivity > 0 ? (activeUsers / usersWithActivity) * 100 : 0;
    const avgDaysSinceActivity =
      usersWithActivity > 0 ? totalDaysSinceActivity / usersWithActivity : 0;

    const recentlyActiveRatio =
      (activityDistribution['0-7'] + activityDistribution['8-14']) / Math.max(totalSeats, 1);
    const dormantRatio = activityDistribution['60+'] / Math.max(totalSeats, 1);

    let trend: 'improving' | 'stable' | 'declining';
    if (recentlyActiveRatio > 0.5 && dormantRatio < 0.1) {
      trend = 'improving';
    } else if (dormantRatio > 0.3 || activeRate < 40) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    teamMetrics.push({
      name,
      totalSeats,
      activeUsers,
      inactiveUsers,
      dormantUsers,
      activeRate,
      avgDaysSinceActivity,
      activityDistribution,
      surfaceDistribution,
      cohortCounts,
      trend,
    });
  }

  return teamMetrics.sort((a, b) => b.totalSeats - a.totalSeats);
}
