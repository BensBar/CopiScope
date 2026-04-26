/**
 * Types ported from copilot-usage-analyzer for seat-level usage analysis.
 * These complement CopiScope's existing metrics types (which focus on
 * code-generation telemetry) with seat-assignment / activity data.
 */

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

export interface ThresholdSettings {
  activeMaxDays: number;
  atRiskMaxDays: number;
  recentAuthDays: number;
}

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  activeMaxDays: 30,
  atRiskMaxDays: 60,
  recentAuthDays: 30,
};

// ---------------------------------------------------------------------------
// Enums / Literal unions
// ---------------------------------------------------------------------------

export type ActivityBucket = '0-7' | '8-14' | '15-30' | '31-60' | '60+' | 'unknown';

export type SurfaceBucket =
  | 'Copilot Chat'
  | 'Copilot in the IDE'
  | 'Copilot CLI'
  | 'Copilot on GitHub.com'
  | 'Unknown';

export type UserCohort =
  | 'active'
  | 'at-risk'
  | 'dormant'
  | 'shelfware'
  | 'data-quality';

export type DataQualityIssue =
  | 'missing-activity-date'
  | 'unknown-surface'
  | 'duplicate-user'
  | 'future-date';

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

export interface CopilotUser {
  id: string;
  identifier: string;
  lastActivity: Date | null;
  lastAuthenticated: Date | null;
  lastSurface: string | null;
  department: string | null;
  daysSinceActivity: number | null;
  daysSinceAuth: number | null;
  activityBucket: ActivityBucket;
  surfaceBucket: SurfaceBucket;
  cohort: UserCohort;
  dataQualityIssues: DataQualityIssue[];
}

// ---------------------------------------------------------------------------
// CSV column mapping
// ---------------------------------------------------------------------------

export interface ColumnMapping {
  identifier: string | null;
  lastActivity: string | null;
  lastAuthenticated: string | null;
  lastSurface: string | null;
  department: string | null;
}

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------------------
// Data quality
// ---------------------------------------------------------------------------

export interface DataQualityWarning {
  type: DataQualityIssue;
  count: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Processed output / metrics
// ---------------------------------------------------------------------------

export interface ProcessedData {
  users: CopilotUser[];
  metrics: UsageDashboardMetrics;
  warnings: DataQualityWarning[];
  hasAuthData: boolean;
  hasDepartmentData: boolean;
  teamMetrics: TeamMetrics[];
}

export interface UsageDashboardMetrics {
  totalSeats: number;
  activeUsers: number;
  inactiveUsers: number;
  dormantUsers: number;
  authButInactive: number;
  activeRate: number;
  activityDistribution: Record<ActivityBucket, number>;
  surfaceDistribution: Record<SurfaceBucket, number>;
  cohortCounts: Record<UserCohort, number>;
}

export interface TeamMetrics {
  name: string;
  totalSeats: number;
  activeUsers: number;
  inactiveUsers: number;
  dormantUsers: number;
  activeRate: number;
  avgDaysSinceActivity: number;
  activityDistribution: Record<ActivityBucket, number>;
  surfaceDistribution: Record<SurfaceBucket, number>;
  cohortCounts: Record<UserCohort, number>;
  trend: 'improving' | 'stable' | 'declining';
}

// ---------------------------------------------------------------------------
// Insights / recommendations
// ---------------------------------------------------------------------------

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
}

export interface RecommendedAction {
  title: string;
  description: string;
  cohort: UserCohort;
  userCount: number;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export interface ComparisonData {
  baselineName: string;
  currentName: string;
  baselineDate: Date;
  currentDate: Date;
  baselineMetrics: UsageDashboardMetrics;
  currentMetrics: UsageDashboardMetrics;
  changes: MetricChanges;
  userChanges: UserStatusChanges;
}

export interface MetricChanges {
  totalSeatsChange: number;
  activeUsersChange: number;
  inactiveUsersChange: number;
  dormantUsersChange: number;
  activeRateChange: number;
}

export interface UserStatusChanges {
  newUsers: string[];
  removedUsers: string[];
  becameActive: string[];
  becameDormant: string[];
  improved: string[];
  declined: string[];
}
