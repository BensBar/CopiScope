/**
 * Dataset comparison — diff two `ProcessedData` snapshots to surface
 * changes in seat counts, active rates and per-user status transitions.
 */

import type {
  ProcessedData,
  ComparisonData,
  MetricChanges,
  UserStatusChanges,
} from '@/types/usage';

// ---------------------------------------------------------------------------
// Compare two snapshots
// ---------------------------------------------------------------------------

export function compareDatasets(
  baseline: ProcessedData,
  current: ProcessedData,
  baselineName: string,
  currentName: string,
): ComparisonData {
  const baselineUserMap = new Map(
    baseline.users.map((u) => [u.identifier.toLowerCase(), u]),
  );
  const currentUserMap = new Map(
    current.users.map((u) => [u.identifier.toLowerCase(), u]),
  );

  const newUsers: string[] = [];
  const removedUsers: string[] = [];
  const becameActive: string[] = [];
  const becameDormant: string[] = [];
  const improved: string[] = [];
  const declined: string[] = [];

  currentUserMap.forEach((currentUser, id) => {
    const baselineUser = baselineUserMap.get(id);
    if (!baselineUser) {
      newUsers.push(currentUser.identifier);
    } else {
      const baselineDays = baselineUser.daysSinceActivity;
      const currentDays = currentUser.daysSinceActivity;

      if (baselineDays !== null && currentDays !== null) {
        if (baselineDays > 30 && currentDays <= 30) {
          becameActive.push(currentUser.identifier);
        } else if (baselineDays <= 60 && currentDays > 60) {
          becameDormant.push(currentUser.identifier);
        } else if (currentDays < baselineDays - 7) {
          improved.push(currentUser.identifier);
        } else if (currentDays > baselineDays + 14) {
          declined.push(currentUser.identifier);
        }
      }
    }
  });

  baselineUserMap.forEach((baselineUser, id) => {
    if (!currentUserMap.has(id)) {
      removedUsers.push(baselineUser.identifier);
    }
  });

  const changes: MetricChanges = {
    totalSeatsChange: current.metrics.totalSeats - baseline.metrics.totalSeats,
    activeUsersChange: current.metrics.activeUsers - baseline.metrics.activeUsers,
    inactiveUsersChange: current.metrics.inactiveUsers - baseline.metrics.inactiveUsers,
    dormantUsersChange: current.metrics.dormantUsers - baseline.metrics.dormantUsers,
    activeRateChange: current.metrics.activeRate - baseline.metrics.activeRate,
  };

  const userChanges: UserStatusChanges = {
    newUsers,
    removedUsers,
    becameActive,
    becameDormant,
    improved,
    declined,
  };

  return {
    baselineName,
    currentName,
    baselineDate: new Date(),
    currentDate: new Date(),
    baselineMetrics: baseline.metrics,
    currentMetrics: current.metrics,
    changes,
    userChanges,
  };
}

// ---------------------------------------------------------------------------
// Human-readable comparison insights
// ---------------------------------------------------------------------------

export function getComparisonInsights(comparison: ComparisonData): string[] {
  const insights: string[] = [];
  const { changes, userChanges } = comparison;

  if (changes.activeRateChange > 5) {
    insights.push(
      `Active rate improved by ${changes.activeRateChange.toFixed(1)} percentage points.`,
    );
  } else if (changes.activeRateChange < -5) {
    insights.push(
      `Active rate declined by ${Math.abs(changes.activeRateChange).toFixed(1)} percentage points.`,
    );
  }

  if (userChanges.becameActive.length > 0) {
    insights.push(
      `${userChanges.becameActive.length} user${userChanges.becameActive.length === 1 ? '' : 's'} became active since the baseline.`,
    );
  }

  if (userChanges.becameDormant.length > 0) {
    insights.push(
      `${userChanges.becameDormant.length} user${userChanges.becameDormant.length === 1 ? '' : 's'} became dormant since the baseline.`,
    );
  }

  if (userChanges.newUsers.length > 0) {
    insights.push(
      `${userChanges.newUsers.length} new user${userChanges.newUsers.length === 1 ? '' : 's'} added.`,
    );
  }

  if (userChanges.removedUsers.length > 0) {
    insights.push(
      `${userChanges.removedUsers.length} user${userChanges.removedUsers.length === 1 ? '' : 's'} removed or no longer in dataset.`,
    );
  }

  if (changes.dormantUsersChange < 0) {
    insights.push(`Dormant seats reduced by ${Math.abs(changes.dormantUsersChange)}.`);
  } else if (changes.dormantUsersChange > 0) {
    insights.push(`Dormant seats increased by ${changes.dormantUsersChange}.`);
  }

  return insights;
}
